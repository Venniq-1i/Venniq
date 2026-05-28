import type { Contract } from '@/types'

const CF_API = 'https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json'

// Raw shape returned by the CF API (v2)
interface CFItem {
  id: string
  noticeIdentifier: string
  title: string
  description?: string
  organisationName: string
  valueLow?: number
  valueHigh?: number
  deadlineDate?: string
  publishedDate?: string
  cpvCodes?: string
  cpvDescription?: string
  cpvDescriptionExpanded?: string
  noticeType?: string
  noticeStatus?: string
  region?: string
  awardedSupplier?: string
  awardedDate?: string
  awardedValue?: number
}

type ProcurementStage = 'early_engagement' | 'future_opportunity' | 'opportunity' | 'awarded'

function mapProcurementStage(noticeType: string = '', noticeStatus: string = ''): ProcurementStage {
  const type = noticeType.toLowerCase()
  const status = noticeStatus.toLowerCase()
  if (type.includes('prior information') || type.includes('pin') || type.includes('market engagement') || type.includes('request for information')) return 'early_engagement'
  if (type.includes('planned') || type.includes('future') || type.includes('pre-procurement') || type.includes('pipeline')) return 'future_opportunity'
  if (status === 'awarded' || type.includes('award')) return 'awarded'
  return 'opportunity'
}

interface CFResponse {
  hitCount: number
  noticeList: Array<{ score: number; item: CFItem }>
}

export function mapCategory(cpvDesc: string = '', cpvExpanded: string = '', title: string): string {
  const text = `${title} ${cpvDesc} ${cpvExpanded}`.toLowerCase()
  if (/digital|software|technology|data|cyber|cloud|it |ict|tech|saas|ai |platform|application/.test(text)) return 'Digital / Technology'
  if (/finance|accounting|audit|tax|advisory|economic|treasury/.test(text)) return 'Finance / Advisory'
  if (/property|estate|facilities|surveying|valuation|real estate/.test(text)) return 'Property / Advisory'
  if (/programme management|project management|pmo|portfolio|delivery management/.test(text)) return 'Infrastructure / PMO'
  if (/infrastructure|civil|structural|rail|road|highway|transport|utilities|energy|water/.test(text)) return 'Infrastructure'
  if (/construction|building work|contractor|fit-out/.test(text)) return 'Construction'
  if (/legal|compliance|regulatory|solicitor|governance/.test(text)) return 'Legal / Compliance'
  if (/\bhr\b|human resource|recruitment|workforce|training|learning/.test(text)) return 'HR / Workforce'
  if (/marketing|communications|\bpr\b|media|brand|creative/.test(text)) return 'Marketing / Communications'
  return 'Advisory'
}

function bestValue(item: CFItem): number {
  // Prefer awardedValue / high value; fall back to low
  return item.valueHigh ?? item.valueLow ?? 0
}

function isAwarded(item: CFItem): boolean {
  const status = (item.noticeStatus ?? '').toLowerCase()
  const type = (item.noticeType ?? '').toLowerCase()
  return status === 'awarded' || type.includes('award')
}

async function cfFetch(body: Record<string, unknown>): Promise<CFItem[]> {
  try {
    const res = await fetch(CF_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[ContractsFinder] API error:', res.status, await res.text().catch(() => ''))
      return []
    }
    const data = await res.json() as CFResponse
    return (data.noticeList ?? []).map(n => n.item)
  } catch (err) {
    console.error('[ContractsFinder] Fetch error:', err)
    return []
  }
}

// Results fetched per keyword group per pass.
// CF API ranks by relevance so the first page is the best matches.
const RESULTS_PER_GROUP = 100

// How many days back to look for recently-awarded contracts (Mode A intelligence).
// Separate from the main lookback so we don't flood results with old awards.
const AWARDED_LOOKBACK_DAYS = 30

/**
 * Fetches contracts from Contracts Finder in two explicit passes:
 *
 * Pass 1 — Active opportunities (early engagement, live tenders).
 *   One call per keyword group. Results are deduplicated.
 *   These are contracts you can still act on and are surfaced first.
 *
 * Pass 2 — Recent awarded contracts (Mode A intelligence).
 *   Single broad call (no keyword filter). Awarded contracts are useful for
 *   identifying relationship opportunities with the winning supplier, but
 *   they should not crowd out live opportunities.
 *
 * Final result is sorted: active opportunities first, awarded last.
 */
export async function fetchContractsFromFinder(
  keywordGroups: string[][],
  minValue: number,
  lookbackDays = 60
): Promise<Partial<Contract>[]> {
  const publishedFrom = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const awardedFrom = new Date(Date.now() - AWARDED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const activeItems = new Map<string, CFItem>()
  const awardedItems = new Map<string, CFItem>()

  const groups = keywordGroups.length > 0 ? keywordGroups : [[]]

  // ── Pass 1: Active / live opportunities ───────────────────────────────────
  for (const group of groups) {
    const body: Record<string, unknown> = {
      publishedFrom,
      size: RESULTS_PER_GROUP,
      from: 0,
      status: 'published',           // CF API: active/live notices only
      ...(group.length > 0 && { keyword: group.join(' ') }),
      ...(minValue > 0 && { valueFrom: minValue * 0.5 }),
    }

    const items = await cfFetch(body)
    // Client-side safety filter: exclude anything that ended up awarded
    const active = items.filter(i => !isAwarded(i))
    let newCount = 0
    for (const item of active) {
      if (!activeItems.has(item.id)) { activeItems.set(item.id, item); newCount++ }
    }
    console.log(`[CF:active] group="${group.slice(0, 3).join(',')}" got=${active.length} new=${newCount} total=${activeItems.size}`)
  }

  // ── Pass 2: Recently awarded contracts (Mode A intelligence) ──────────────
  // Single broad call — no keyword filter so we cast a wide net for awards.
  const awardedBody: Record<string, unknown> = {
    publishedFrom: awardedFrom,
    size: RESULTS_PER_GROUP,
    from: 0,
    status: 'awarded',
    ...(minValue > 0 && { valueFrom: minValue * 0.5 }),
  }

  const awardedPage = await cfFetch(awardedBody)
  const confirmedAwarded = awardedPage.filter(isAwarded)
  for (const item of confirmedAwarded) {
    if (!activeItems.has(item.id)) awardedItems.set(item.id, item)
  }
  console.log(`[CF:awarded] got=${confirmedAwarded.length} total=${awardedItems.size}`)

  // Active opportunities first, then awarded (so AI sees live tenders at top of each batch)
  const ordered = [...activeItems.values(), ...awardedItems.values()]

  return ordered
    .filter(item => bestValue(item) >= minValue)
    .map(item => ({
      external_id: item.id,
      source: 'contracts_finder' as const,
      // Official fields — stored exactly as returned by the CF API
      title: item.title,
      issuer: item.organisationName ?? 'Unknown',
      reference: item.noticeIdentifier ?? item.id,
      value: bestValue(item),
      value_low: item.valueLow ?? null,
      value_high: item.valueHigh ?? null,
      deadline: item.deadlineDate ? item.deadlineDate.split('T')[0] : undefined,
      published_at: item.publishedDate ?? undefined,
      contract_status: item.noticeStatus ?? null,
      full_description: item.description ?? null,
      // Truncated description for matching/search use — not shown as official
      description: item.description?.slice(0, 500) ?? '',
      // Our derived category (used for Mode A/B classification — not an official CF field)
      category: mapCategory(item.cpvDescription, item.cpvDescriptionExpanded, item.title),
      // Direct link to the original CF listing — verified format: /Notice/[uuid]
      source_url: `https://www.contractsfinder.service.gov.uk/Notice/${item.id}`,
      // Procurement stage — mapped from noticeType + noticeStatus
      procurement_stage: mapProcurementStage(item.noticeType, item.noticeStatus),
      notice_type: item.noticeType ?? null,
      // Awarded contract details — only populated when the contract has been awarded
      awarded_supplier: item.awardedSupplier ?? null,
      awarded_date: item.awardedDate ? item.awardedDate.split('T')[0] : null,
      awarded_value: item.awardedValue ?? null,
      companies_house_url: item.awardedSupplier
        ? `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(item.awardedSupplier)}`
        : null,
      status: 'new' as const,
    }))
}
