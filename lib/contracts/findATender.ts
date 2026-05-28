import type { Contract } from '@/types'
import { mapCategory } from '@/lib/contracts/contractsFinder'

const FTS_API = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages'
const RESULTS_PER_PAGE = 100
const AWARDED_LOOKBACK_DAYS = 30

// OCDS v1.1.5 types (UK FTS extension)
interface OCDSParty {
  id?: string
  name: string
  roles: string[]
}

interface OCDSValue {
  amount?: number
  amountGross?: number
  currency?: string
}

interface OCDSTender {
  id?: string
  title?: string
  description?: string
  status?: string
  value?: OCDSValue
  tenderPeriod?: { endDate?: string }
  classification?: { scheme?: string; id?: string; description?: string }
  additionalClassifications?: Array<{ description?: string }>
}

interface OCDSAward {
  id?: string
  date?: string
  value?: OCDSValue
  suppliers?: Array<{ name: string }>
  items?: Array<{ additionalClassifications?: Array<{ description?: string }> }>
}

interface OCDSRelease {
  id: string
  date?: string
  tag?: string[]
  buyer?: { id?: string; name?: string }
  parties?: OCDSParty[]
  tender?: OCDSTender
  awards?: OCDSAward[]
}

interface FTSResponse {
  releases: OCDSRelease[]
  links?: { next?: string }
}

type ProcurementStage = 'early_engagement' | 'future_opportunity' | 'opportunity' | 'awarded'

function mapFTSProcurementStage(tags: string[] = []): ProcurementStage {
  if (tags.includes('award') || tags.includes('contractAward')) return 'awarded'
  if (tags.includes('planning') || tags.includes('priorInformationNotice')) return 'future_opportunity'
  if (tags.includes('tender')) return 'opportunity'
  return 'opportunity'
}

function getBuyerName(release: OCDSRelease): string {
  // Prefer buyer reference resolved via parties array
  if (release.parties) {
    const buyer = release.parties.find(p => p.roles.includes('buyer') || p.roles.includes('procuringEntity'))
    if (buyer?.name) return buyer.name
  }
  return release.buyer?.name ?? 'Unknown'
}

function bestAmount(v?: OCDSValue): number {
  if (!v) return 0
  return v.amount ?? v.amountGross ?? 0
}

function getCPVText(release: OCDSRelease): string {
  const fromTender = [
    release.tender?.classification?.description ?? '',
    ...(release.tender?.additionalClassifications ?? []).map(c => c.description ?? ''),
  ].join(' ')
  // CPV codes also appear on award items in the real FTS response
  const fromAwardItems = (release.awards ?? []).flatMap(a =>
    (a.items ?? []).flatMap(i =>
      (i.additionalClassifications ?? []).map((c: { description?: string }) => c.description ?? '')
    )
  ).join(' ')
  return `${fromTender} ${fromAwardItems}`
}

async function ftsFetch(
  params: Record<string, string>,
  retries = 3
): Promise<FTSResponse> {
  const url = new URL(FTS_API)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })

      if (res.status === 429 || res.status === 503) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10)
        console.warn(`[FTS] Rate limited (${res.status}), retrying in ${retryAfter}s`)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }

      if (!res.ok) {
        console.error('[FTS] API error:', res.status, await res.text().catch(() => ''))
        return { releases: [] }
      }

      return await res.json() as FTSResponse
    } catch (err) {
      console.error(`[FTS] Fetch error (attempt ${attempt + 1}):`, err)
      if (attempt === retries - 1) return { releases: [] }
    }
  }

  return { releases: [] }
}

async function fetchFTSPage(
  updatedFrom: string,
  stages: string,
  cursor?: string
): Promise<{ releases: OCDSRelease[]; nextCursor?: string }> {
  const params: Record<string, string> = {
    updatedFrom,
    limit: String(RESULTS_PER_PAGE),
    stages,
  }
  if (cursor) params.cursor = cursor

  const data = await ftsFetch(params)
  const nextCursor = data.links?.next
    ? new URL(data.links.next).searchParams.get('cursor') ?? undefined
    : undefined

  return { releases: data.releases ?? [], nextCursor }
}

async function fetchAllFTSReleases(
  updatedFrom: string,
  stages: string
): Promise<OCDSRelease[]> {
  const all: OCDSRelease[] = []
  let cursor: string | undefined

  do {
    const { releases, nextCursor } = await fetchFTSPage(updatedFrom, stages, cursor)
    all.push(...releases)
    cursor = nextCursor
    console.log(`[FTS:${stages}] fetched=${releases.length} total=${all.length} hasMore=${!!nextCursor}`)
  } while (cursor)

  return all
}

function releaseToContract(release: OCDSRelease): Partial<Contract> | null {
  const tender = release.tender
  if (!tender?.title) return null

  const tags = release.tag ?? []
  const isAwarded = tags.includes('award') || tags.includes('contractAward')
  const award = release.awards?.[0]
  const tenderAmount = bestAmount(tender.value)
  const awardAmount = bestAmount(award?.value)
  const value = isAwarded ? (awardAmount || tenderAmount) : tenderAmount

  const cpvText = getCPVText(release)

  return {
    external_id: release.id,
    source: 'find_a_tender' as const,
    title: tender.title,
    issuer: getBuyerName(release),
    reference: tender.id ?? release.id,
    value,
    value_low: tenderAmount || null,
    value_high: awardAmount || tenderAmount || null,
    deadline: tender.tenderPeriod?.endDate?.split('T')[0] ?? undefined,
    published_at: release.date ?? undefined,
    contract_status: tender.status ?? null,
    full_description: tender.description ?? null,
    description: tender.description?.slice(0, 500) ?? '',
    category: mapCategory(cpvText, '', tender.title),
    source_url: `https://www.find-tender.service.gov.uk/Notice/${release.id}`,
    procurement_stage: mapFTSProcurementStage(tags),
    notice_type: tags[0] ?? null,
    awarded_supplier: award?.suppliers?.[0]?.name ?? null,
    awarded_date: award?.date?.split('T')[0] ?? null,
    awarded_value: awardAmount || null,
    companies_house_url: award?.suppliers?.[0]?.name
      ? `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(award.suppliers[0].name)}`
      : null,
    status: 'new' as const,
  }
}

/**
 * Fetches contracts from Find a Tender Service in two passes:
 *
 * Pass 1 — Active tenders (stages=tender).
 *   Paginated, all results within the lookback window.
 *
 * Pass 2 — Awarded contracts (stages=award).
 *   Fixed 30-day lookback regardless of main lookbackDays (Mode A intelligence).
 *
 * Unlike Contracts Finder, FTS has no keyword search — we fetch everything
 * updated in the window and rely on the AI relevance filter downstream.
 */
export async function fetchContractsFromFTS(
  minValue: number,
  lookbackDays = 60
): Promise<Partial<Contract>[]> {
  const updatedFrom = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
  const awardedFrom = new Date(Date.now() - AWARDED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Pass 1: active tender notices
  const tenderReleases = await fetchAllFTSReleases(updatedFrom, 'tender')

  // Pass 2: award notices (separate, fixed lookback)
  const awardReleases = await fetchAllFTSReleases(awardedFrom, 'award')

  // Deduplicate by release id — active first, awarded appended
  const seen = new Set<string>()
  const ordered: OCDSRelease[] = []

  for (const r of [...tenderReleases, ...awardReleases]) {
    if (!seen.has(r.id)) { seen.add(r.id); ordered.push(r) }
  }

  const contracts = ordered
    .map(releaseToContract)
    .filter((c): c is Partial<Contract> => c !== null)
    .filter(c => (c.value ?? 0) >= minValue)

  console.log(`[FTS] Total after map+filter: ${contracts.length}`)
  return contracts
}
