import Anthropic from '@anthropic-ai/sdk'
import type { ServiceLine } from '@/types'

export interface ScrapedProfile {
  company_overview: string
  core_markets: string[]
  geographical_focus: string
  service_lines: ServiceLine[]
  company_name?: string          // extracted from website — used by Step 1 for mismatch check
  manual_entry_needed?: boolean  // true when AI could not identify service lines
  scrape_note?: string
}

const KNOWN_MARKETS = [
  'Transport', 'Central Government', 'Local Government', 'Healthcare',
  'Energy & Utilities', 'Defence', 'Housing & Real Estate', 'Financial Services',
  'Education', 'Environment', 'Justice & Emergency Services',
  'Digital / Technology', 'Construction', 'Infrastructure',
]

// Nav link text that typically leads to service / capability pages
const SERVICE_NAV_PATTERNS = [
  'what we do',
  'our services',
  'services',
  'solutions',
  'capabilities',
  'markets',
  'end markets',
  'sectors',
  'expertise',
  'what we offer',
  'our work',
  'practice areas',
  'industries',
]

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Venniq/1.0; +https://venniq.com)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-GB,en;q=0.9',
}

async function fetchHTML(url: string, timeoutMs = 10_000): Promise<string> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// Strips page body content for use as descriptive context (removes nav/header/footer).
function stripToBodyText(html: string, maxChars = 6000): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxChars)
}

// Extracts structured text from nav, header, and footer tags — these are where
// service line names live (dropdown items, footer links). Preserved separately
// so Claude can anchor service line names to the navigation structure rather
// than inferring them from body prose.
function extractNavAndFooterText(html: string, maxChars = 6000): string {
  const chunks: string[] = []

  const navMatches = html.match(/<nav[\s\S]*?<\/nav>/gi) ?? []
  const headerMatches = html.match(/<header[\s\S]*?<\/header>/gi) ?? []
  const footerMatches = html.match(/<footer[\s\S]*?<\/footer>/gi) ?? []

  for (const block of [...headerMatches, ...navMatches, ...footerMatches]) {
    const text = block
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (text.length > 20) chunks.push(text)
  }

  return chunks.join('\n\n').slice(0, maxChars)
}

function extractServiceNavLinks(html: string, baseUrl: string): string[] {
  const navChunks: string[] = html.slice(0, 15_000) ? [html.slice(0, 15_000)] : []
  const navMatches = html.match(/<nav[\s\S]*?<\/nav>/gi) ?? []
  const headerMatches = html.match(/<header[\s\S]*?<\/header>/gi) ?? []
  const footerMatches = html.match(/<footer[\s\S]*?<\/footer>/gi) ?? []
  const searchArea = [...navChunks, ...navMatches, ...headerMatches, ...footerMatches].join(' ')

  const seen = new Set<string>()
  const links: string[] = []

  const anchors = [...searchArea.matchAll(/<a[^>]+href=["']([^"'#][^"'?]*)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  for (const anchor of anchors) {
    const href = anchor[1].trim()
    const linkText = anchor[2].replace(/<[^>]+>/g, '').trim().toLowerCase()

    if (SERVICE_NAV_PATTERNS.some(kw => linkText.includes(kw))) {
      try {
        const resolved = new URL(href, baseUrl).href
        if (!seen.has(resolved) && resolved.startsWith('http')) {
          seen.add(resolved)
          links.push(resolved)
        }
      } catch { /* skip */ }
    }
  }

  links.sort((a, b) => a.split('/').length - b.split('/').length)
  return links.slice(0, 3)
}

async function callClaude(client: Anthropic, content: string, loose = false): Promise<ScrapedProfile | null> {
  const nameRule = loose
    ? '6. If you truly cannot identify any service areas, return an empty service_lines array — do NOT fabricate.'
    : `6. Service line NAMES must come from the navigation structure — the items listed under "What We Do", "Services", "Capabilities", etc. in the NAV/HEADER/FOOTER NAVIGATION section. Do not invent names from body prose.
7. Use the sub-page / body content to write descriptions, typical_clients, and contract_keywords. Only create a service line entry if the name appears in the navigation.
8. If you genuinely cannot find a clear service structure, return an empty service_lines array. Do NOT fabricate.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are helping configure an AI contract matching platform. I have fetched content from a professional services firm's website. Extract their ACTUAL service and capability structure using their own words and terminology exactly as they appear on the site.

CRITICAL RULES:
1. Use the company's own names for their service areas verbatim. If they call it "Cities & Places", write "Cities & Places" — never translate it to "Urban Infrastructure" or any synonym.
2. Look specifically for navigation sections like "What We Do", "Services", "Solutions", "Capabilities", "Markets", "End Markets", "Sectors", "Expertise", or "Practice Areas". The DIRECT CHILDREN of whichever section is found (the dropdown/sub-menu items one level below) represent the correct level of granularity.
3. Do NOT invent or guess service areas. Only extract what is clearly and explicitly stated.
4. If the firm has distinct "Markets" and "Capabilities" dimensions, prefer Capabilities — they map more directly to what the firm delivers.
5. Extract company_name from the page <title>, <h1>, logo alt text, or prominent brand mention.
${nameRule}

WEBSITE CONTENT:
${content}

Return ONLY valid JSON (no markdown, no explanation) matching this structure:
{
  "company_name": "The firm's trading name as it appears on the site",
  "company_overview": "2–3 sentences describing this firm based only on what the website states. Include scale, sector focus, and client types if stated.",
  "core_markets": ["sectors from this list only: ${KNOWN_MARKETS.join(', ')}"],
  "geographical_focus": "One sentence on where they operate — use their own stated regions or offices.",
  "service_lines": [
    {
      "name": "Exact name from navigation — e.g. 'Cities & Places' not 'Urban Planning'",
      "description": "2–3 sentences using the firm's own language about what this service delivers.",
      "typical_clients": "What types of clients or projects does the site say they serve with this service?",
      "contract_keywords": "Terms contracts use when procuring this type of work — include synonyms and abbreviations.",
      "delivery_capabilities": ["Select all that apply from ONLY this list: Advisory & Consulting, Feasibility Studies, Business Case, Design, Programme Management, Project Management, Construction & Delivery, Contract Management, Operations & Maintenance, Research & Analysis, Data & Technology, Training & Capacity Building"]
    }
  ]
}

Extract ALL service lines the firm offers — do not impose any limit. Use the firm's exact terminology throughout. For delivery_capabilities, only include items from the provided list that genuinely match how this service line delivers work.`,
    }],
  })

  const textBlock = response.content.find(c => c.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  const raw = textBlock.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    return JSON.parse(jsonMatch[0]) as ScrapedProfile
  } catch {
    return null
  }
}

async function tryLinkedIn(client: Anthropic, companyName: string): Promise<ServiceLine[] | null> {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const url = `https://www.linkedin.com/company/${slug}/about/`
  try {
    const html = await fetchHTML(url, 8000)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 4000)

    if (text.length < 200) return null

    const parsed = await callClaude(client, `=== LINKEDIN ABOUT PAGE ===\n${text}`, true)
    return parsed?.service_lines?.length ? parsed.service_lines : null
  } catch {
    return null
  }
}

async function tryWebSearch(client: Anthropic, companyName: string): Promise<ServiceLine[] | null> {
  const query = encodeURIComponent(`${companyName} services what we do`)
  const url = `https://html.duckduckgo.com/html/?q=${query}`
  try {
    const html = await fetchHTML(url, 8000)
    const snippets = [...html.matchAll(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim())
      .filter(s => s.length > 30)
      .slice(0, 8)
      .join('\n')

    if (!snippets) return null

    const parsed = await callClaude(client, `=== WEB SEARCH RESULTS for "${companyName} services" ===\n${snippets}`, true)
    return parsed?.service_lines?.length ? parsed.service_lines : null
  } catch {
    return null
  }
}

export async function scrapeServicesFromWebsite(url: string): Promise<ScrapedProfile> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // ── 1. Fetch homepage ────────────────────────────────────────────────────
  let homepageHTML = ''
  try {
    homepageHTML = await fetchHTML(url)
  } catch {
    throw new Error('Could not fetch website. Check the URL and try again.')
  }

  // ── 2. Extract nav/footer structure (service line names live here) ───────
  const navFooterText = extractNavAndFooterText(homepageHTML)

  // ── 3. Find and follow service/capability nav pages (for descriptions) ───
  const servicePageUrls = extractServiceNavLinks(homepageHTML, url)

  const pageSections: { label: string; text: string }[] = [
    { label: 'HOMEPAGE', text: stripToBodyText(homepageHTML, 4000) },
  ]

  let foundStructuredPages = false
  for (const pageUrl of servicePageUrls) {
    try {
      const html = await fetchHTML(pageUrl, 8000)
      const text = stripToBodyText(html, 5000)
      if (text.length > 200) {
        const path = new URL(pageUrl).pathname
          .replace(/\//g, ' › ')
          .replace(/[-_]/g, ' ')
          .trim()
        pageSections.push({ label: `PAGE: ${path || pageUrl}`, text })
        foundStructuredPages = true
      }
    } catch { /* skip pages that fail */ }
  }

  // ── 4. Build combined content — nav structure first, then body pages ─────
  const navSection = navFooterText
    ? `=== NAV/HEADER/FOOTER NAVIGATION ===\n${navFooterText}\n\n`
    : ''

  const bodyContent = pageSections
    .map(s => `=== ${s.label} ===\n${s.text}`)
    .join('\n\n')

  const combinedContent = navSection + bodyContent

  const scrapeNote = foundStructuredPages
    ? `Extracted from homepage navigation + ${pageSections.length - 1} service/capability page(s).`
    : `Only the homepage was available — no dedicated service or capability pages were found. Service lines are based on homepage content only and may be less accurate. Please review carefully.`

  // ── 5. Primary Claude extraction ─────────────────────────────────────────
  let parsed = await callClaude(client, combinedContent)

  // ── 6. Fallback hierarchy if service lines came back empty ───────────────
  if (!parsed?.service_lines?.length) {
    // a. Re-try with homepage body only and a looser prompt
    const bodyOnly = pageSections.map(s => `=== ${s.label} ===\n${s.text}`).join('\n\n')
    parsed = await callClaude(client, bodyOnly, true)
  }

  if (!parsed?.service_lines?.length) {
    // b. Try LinkedIn
    const companyName = parsed?.company_name ?? new URL(url).hostname.replace(/^www\./, '')
    const linkedInLines = await tryLinkedIn(client, companyName)
    if (linkedInLines) {
      return {
        company_name: parsed?.company_name,
        company_overview: parsed?.company_overview ?? '',
        core_markets: parsed?.core_markets ?? [],
        geographical_focus: parsed?.geographical_focus ?? '',
        service_lines: linkedInLines,
        scrape_note: 'Service lines extracted from LinkedIn company profile — please review and adjust.',
      }
    }
  }

  if (!parsed?.service_lines?.length) {
    // c. Try DuckDuckGo web search
    const companyName = parsed?.company_name ?? new URL(url).hostname.replace(/^www\./, '')
    const searchLines = await tryWebSearch(client, companyName)
    if (searchLines) {
      return {
        company_name: parsed?.company_name,
        company_overview: parsed?.company_overview ?? '',
        core_markets: parsed?.core_markets ?? [],
        geographical_focus: parsed?.geographical_focus ?? '',
        service_lines: searchLines,
        scrape_note: 'Service lines inferred from web search results — please review carefully.',
      }
    }
  }

  // d. All fallbacks exhausted — signal manual entry needed
  if (!parsed?.service_lines?.length) {
    return {
      company_name: parsed?.company_name,
      company_overview: parsed?.company_overview ?? '',
      core_markets: parsed?.core_markets ?? [],
      geographical_focus: parsed?.geographical_focus ?? '',
      service_lines: [],
      manual_entry_needed: true,
      scrape_note: scrapeNote,
    }
  }

  return {
    company_name: parsed.company_name,
    company_overview: parsed.company_overview?.trim() ?? '',
    core_markets: Array.isArray(parsed.core_markets) ? parsed.core_markets : [],
    geographical_focus: parsed.geographical_focus?.trim() ?? '',
    service_lines: Array.isArray(parsed.service_lines) ? parsed.service_lines : [],
    scrape_note: scrapeNote,
  }
}
