import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirmProfile, Department } from '@/types'
import { fetchContractsFromFinder } from '@/lib/contracts/contractsFinder'
import { fetchContractsFromFTS } from '@/lib/contracts/findATender'
import { aiFilterContracts } from '@/lib/contracts/aiRelevanceFilter'

// FRAMEWORK FILTER: controlled by firm's include_framework_contracts preference in Settings → Contract Preferences
function isFrameworkContract(c: Partial<import('@/types').Contract>): boolean {
  const notice = (c.notice_type ?? '').toLowerCase()
  const text = `${c.title ?? ''} ${c.description ?? ''}`.toLowerCase()
  return (
    notice.includes('framework') ||
    notice.includes('dynamic purchasing') ||
    notice.includes('dps') ||
    text.includes('framework agreement') ||
    text.includes('dynamic purchasing system') ||
    text.includes('call-off framework')
  )
}

export type IngestProgressEvent =
  | { stage: 'fetching'; source: string }
  | { stage: 'ai_filtering'; dept: string; batch: number; total: number }
  | { stage: 'saving'; count: number }

export interface IngestResult {
  rawFetched: number
  filtered: number
  inserted: number
  newIds: string[]
}

/**
 * Ingests new contracts for a single firm from all enabled data sources.
 * Safe to call with a service-role Supabase client (no user session required).
 * Only inserts contracts that don't already exist — never overwrites existing status.
 *
 * lookbackDays: how far back to search. Use 2 for the daily cron, 60 for a manual catch-up fetch.
 * skipAI: skip AI relevance filtering — use for manual fetches on Vercel Hobby (60s limit).
 *         Contracts are stored as-is; the nightly cron will AI-score them.
 */
export async function ingestFirmContracts(
  supabase: SupabaseClient,
  firmId: string,
  profile: FirmProfile,
  departments: Department[],
  lookbackDays = 60,
  skipAI = false,
  onProgress?: (event: IngestProgressEvent) => void
): Promise<IngestResult> {
  const contractSources = profile.contract_sources ?? []
  const enabledSources = contractSources.length === 0
    ? [{ source: 'contracts_finder' }, { source: 'find_a_tender' }]
    : contractSources.filter(s => s.enabled && !s.comingSoon)

  if (enabledSources.length === 0) {
    console.log(`[Ingest:${firmId}] No enabled sources — skipping`)
    return { rawFetched: 0, filtered: 0, inserted: 0, newIds: [] }
  }

  let rawFetched = 0
  let filtered = 0
  const allNewIds: string[] = []

  // Run all enabled sources in parallel
  const sourcePromises = enabledSources.map(source => {
    if (source.source === 'contracts_finder') {
      return ingestContractsFinder(supabase, firmId, profile, departments, lookbackDays, skipAI, onProgress)
    } else if (source.source === 'find_a_tender') {
      return ingestFindATender(supabase, firmId, profile, departments, lookbackDays, skipAI, skipAI ? 3 : 10, onProgress)
    }
    return Promise.resolve({ rawFetched: 0, filtered: 0, inserted: 0, newIds: [] })
  })

  const results = await Promise.all(sourcePromises)
  for (const result of results) {
    rawFetched += result.rawFetched
    filtered += result.filtered
    allNewIds.push(...result.newIds)
  }

  return { rawFetched, filtered, inserted: allNewIds.length, newIds: allNewIds }
}

/**
 * Builds keyword groups for the Contracts Finder search.
 * Each group becomes a separate search pass so a large firm's full capability
 * breadth is covered — not just the first few profile-level keywords.
 *
 * Groups:
 *   1. Profile-level keywords (all of them)
 *   2. One group per service line's contract_keywords
 *   3. One group per department's keywords_synonyms
 */
function buildKeywordGroups(profile: FirmProfile, departments: Department[]): string[][] {
  const groups: string[][] = []

  // Group 1: all profile-level keywords
  if ((profile.keywords ?? []).length > 0) {
    groups.push(profile.keywords)
  }

  // Group 2+: one per service line
  for (const sl of profile.service_lines ?? []) {
    const terms = sl.contract_keywords
      ?.split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean) ?? []
    if (terms.length > 0) groups.push(terms)
  }

  // Group 3+: one per department
  for (const dept of departments) {
    const terms = dept.keywords_synonyms
      ?.split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean) ?? []
    if (terms.length > 0) groups.push(terms)
  }

  // Deduplicate identical groups
  const seen = new Set<string>()
  return groups.filter(g => {
    const key = g.sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function ingestContractsFinder(
  supabase: SupabaseClient,
  firmId: string,
  profile: FirmProfile,
  departments: Department[],
  lookbackDays: number,
  skipAI = false,
  onProgress?: (event: IngestProgressEvent) => void
): Promise<IngestResult> {
  onProgress?.({ stage: 'fetching', source: 'contracts_finder' })
  const keywordGroups = buildKeywordGroups(profile, departments)
  console.log(`[Ingest:${firmId}] Searching with ${keywordGroups.length} keyword group(s)`)

  const raw = await fetchContractsFromFinder(
    keywordGroups,
    profile.min_contract_value,
    lookbackDays
  )

  console.log(`[Ingest:${firmId}] Raw from CF: ${raw.length}`)
  if (raw.length === 0) return { rawFetched: 0, filtered: 0, inserted: 0, newIds: [] }

  // FRAMEWORK FILTER: controlled by firm's include_framework_contracts preference in Settings → Contract Preferences
  const afterFrameworkFilter = profile.include_framework_contracts
    ? raw
    : raw.filter(c => !isFrameworkContract(c))
  if (afterFrameworkFilter.length < raw.length) {
    console.log(`[Ingest:${firmId}] Framework filter dropped ${raw.length - afterFrameworkFilter.length} contracts`)
  }

  // AI relevance filter — skip on manual fetches (Vercel Hobby 60s limit)
  let filteredContracts = afterFrameworkFilter
  let aiResults: Awaited<ReturnType<typeof aiFilterContracts>> = []

  if (!skipAI) {
    const hasProfileContext =
      departments.length > 0 ||
      profile.services_description ||
      profile.company_overview ||
      (profile.service_lines ?? []).length > 0

    if (hasProfileContext) {
      aiResults = await aiFilterContracts(
        afterFrameworkFilter.map(c => ({
          id: c.external_id!,
          title: c.title!,
          description: c.description ?? '',
          value: c.value ?? 0,
          issuer: c.issuer!,
        })),
        profile,
        departments,
        p => onProgress?.({ stage: 'ai_filtering', ...p })
      )

      const relevantIds = new Set(aiResults.filter(r => r.relevant).map(r => r.contractId))
      filteredContracts = afterFrameworkFilter.filter(c => relevantIds.has(c.external_id!))
      console.log(`[Ingest:${firmId}] After AI filter: ${filteredContracts.length} relevant`)
    }
  } else {
    console.log(`[Ingest:${firmId}] Skipping AI filter (skipAI=true) — storing all ${afterFrameworkFilter.length} contracts`)
  }

  if (filteredContracts.length === 0) return { rawFetched: raw.length, filtered: 0, inserted: 0, newIds: [] }

  onProgress?.({ stage: 'saving', count: filteredContracts.length })

  // Determine which external_ids already exist for this firm so we never
  // overwrite a contract that's already been matched or is in processing.
  const externalIds = filteredContracts.map(c => c.external_id!)
  const { data: existing } = await supabase
    .from('contracts')
    .select('external_id')
    .eq('firm_id', firmId)
    .in('external_id', externalIds)

  const existingIds = new Set((existing ?? []).map((r: { external_id: string }) => r.external_id))
  const newContracts = filteredContracts.filter(c => !existingIds.has(c.external_id!))

  console.log(`[Ingest:${firmId}] New contracts to insert: ${newContracts.length}`)
  if (newContracts.length === 0) return { rawFetched: raw.length, filtered: filteredContracts.length, inserted: 0, newIds: [] }

  const aiByExternalId = new Map(aiResults.map(r => [r.contractId, r]))

  const rows = newContracts.map(contract => {
    const ai = aiByExternalId.get(contract.external_id!)
    return {
      ...contract,
      firm_id: firmId,
      ai_rationale: ai?.rationale ?? null,
      ai_departments: ai?.relevantDepartments ?? [],
      ai_confidence: ai?.confidence ?? null,
    }
  })

  const { data: inserted } = await supabase
    .from('contracts')
    .insert(rows)
    .select('id')

  const newIds = (inserted ?? []).map((r: { id: string }) => r.id)
  return { rawFetched: raw.length, filtered: filteredContracts.length, inserted: newIds.length, newIds }
}

async function ingestFindATender(
  supabase: SupabaseClient,
  firmId: string,
  profile: FirmProfile,
  departments: Department[],
  lookbackDays: number,
  skipAI = false,
  maxPages = 10,
  onProgress?: (event: IngestProgressEvent) => void
): Promise<IngestResult> {
  onProgress?.({ stage: 'fetching', source: 'find_a_tender' })
  console.log(`[Ingest:${firmId}] Fetching from Find a Tender Service (date-window, no keywords, maxPages=${maxPages})`)

  const raw = await fetchContractsFromFTS(profile.min_contract_value, lookbackDays, maxPages)

  console.log(`[Ingest:${firmId}] Raw from FTS: ${raw.length}`)
  if (raw.length === 0) return { rawFetched: 0, filtered: 0, inserted: 0, newIds: [] }

  // FRAMEWORK FILTER: controlled by firm's include_framework_contracts preference in Settings → Contract Preferences
  const afterFrameworkFilter = profile.include_framework_contracts
    ? raw
    : raw.filter(c => !isFrameworkContract(c))
  if (afterFrameworkFilter.length < raw.length) {
    console.log(`[Ingest:${firmId}] Framework filter dropped ${raw.length - afterFrameworkFilter.length} FTS contracts`)
  }

  let filteredContracts = afterFrameworkFilter
  let aiResults: Awaited<ReturnType<typeof aiFilterContracts>> = []

  if (!skipAI) {
    const hasProfileContext =
      departments.length > 0 ||
      profile.services_description ||
      profile.company_overview ||
      (profile.service_lines ?? []).length > 0

    if (hasProfileContext) {
      aiResults = await aiFilterContracts(
        afterFrameworkFilter.map(c => ({
          id: c.external_id!,
          title: c.title!,
          description: c.description ?? '',
          value: c.value ?? 0,
          issuer: c.issuer!,
        })),
        profile,
        departments,
        p => onProgress?.({ stage: 'ai_filtering', ...p })
      )

      const relevantIds = new Set(aiResults.filter(r => r.relevant).map(r => r.contractId))
      filteredContracts = afterFrameworkFilter.filter(c => relevantIds.has(c.external_id!))
      console.log(`[Ingest:${firmId}] After AI filter: ${filteredContracts.length} relevant`)
    }
  } else {
    console.log(`[Ingest:${firmId}] Skipping AI filter (skipAI=true) — storing all ${afterFrameworkFilter.length} contracts`)
  }

  if (filteredContracts.length === 0) return { rawFetched: raw.length, filtered: 0, inserted: 0, newIds: [] }

  onProgress?.({ stage: 'saving', count: filteredContracts.length })

  const externalIds = filteredContracts.map(c => c.external_id!)
  const { data: existing } = await supabase
    .from('contracts')
    .select('external_id')
    .eq('firm_id', firmId)
    .in('external_id', externalIds)

  const existingIds = new Set((existing ?? []).map((r: { external_id: string }) => r.external_id))
  const newContracts = filteredContracts.filter(c => !existingIds.has(c.external_id!))

  console.log(`[Ingest:${firmId}] New FTS contracts to insert: ${newContracts.length}`)
  if (newContracts.length === 0) return { rawFetched: raw.length, filtered: filteredContracts.length, inserted: 0, newIds: [] }

  const aiByExternalId = new Map(aiResults.map(r => [r.contractId, r]))

  const rows = newContracts.map(contract => {
    const ai = aiByExternalId.get(contract.external_id!)
    return {
      ...contract,
      firm_id: firmId,
      ai_rationale: ai?.rationale ?? null,
      ai_departments: ai?.relevantDepartments ?? [],
      ai_confidence: ai?.confidence ?? null,
    }
  })

  const { data: inserted } = await supabase
    .from('contracts')
    .insert(rows)
    .select('id')

  const newIds = (inserted ?? []).map((r: { id: string }) => r.id)
  return { rawFetched: raw.length, filtered: filteredContracts.length, inserted: newIds.length, newIds }
}
