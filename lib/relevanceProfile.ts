import type { FirmProfile, Department, Contract, IntentMode } from '@/types'

// Mirror of contractsFinder mapCategory keywords — used for text-based category matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Digital / Technology': ['digital', 'software', 'technology', 'data', 'cyber', 'cloud', 'it ', 'tech', 'platform', 'ict', 'saas', 'ai ', 'system', 'application'],
  'Infrastructure': ['infrastructure', 'civil', 'transport', 'rail', 'road', 'highway', 'utilities', 'energy', 'water', 'network'],
  'Construction': ['construction', 'building works', 'contractor', 'fit-out', 'structural'],
  'Infrastructure / PMO': ['pmo', 'programme management', 'project management', 'portfolio', 'delivery management'],
  'Finance / Advisory': ['finance', 'financial', 'advisory', 'accountan', 'audit', 'tax', 'treasury', 'economic'],
  'Property / Advisory': ['property', 'real estate', 'estate', 'surveying', 'valuation', 'facilities'],
  'Legal / Compliance': ['legal', 'compliance', 'regulatory', 'governance', 'risk management', 'solicitor'],
  'HR / Workforce': ['hr ', 'human resource', 'recruitment', 'talent', 'workforce', 'training', 'learning'],
  'Marketing / Communications': ['marketing', 'communications', 'pr ', 'brand', 'creative', 'media'],
}

function textMatchesCategory(text: string, category: string): boolean {
  const keywords = CATEGORY_KEYWORDS[category]
  if (!keywords) return false
  return keywords.some(kw => text.includes(kw))
}

export function buildProfileMarkdown(
  firmName: string,
  profile: Omit<FirmProfile, 'id' | 'firm_id' | 'profile_markdown' | 'updated_at'>,
  departments: Department[]
): string {
  const maxVal = profile.max_contract_value
    ? `£${(profile.max_contract_value / 1_000_000).toFixed(1)}m`
    : 'no upper limit'

  // ── Section 4: Departments, Service Lines & Delivery Capabilities ────────
  const serviceLinesSections = (profile.service_lines ?? []).length > 0
    ? (profile.service_lines ?? []).map(sl => {
        const capabilities = sl.delivery_capabilities?.length
          ? sl.delivery_capabilities.join(' | ')
          : 'Not specified'
        return `
### ${sl.name}
**Service Line:** ${sl.service_line || 'Not specified'}
**How we deliver:** ${capabilities}
**Description:** ${sl.description || 'Not specified'}
**Who needs it:** ${sl.typical_clients || 'Not specified'}
**Contract keywords:** ${sl.contract_keywords || 'Not specified'}`
      }).join('\n')
    : '_No departments configured yet. Add them in Settings > Company Intelligence._'

  // ── Section 4b: Strategic Accelerators ───────────────────────────────────
  const acceleratorsSection = (profile.strategic_accelerators ?? []).length > 0
    ? (profile.strategic_accelerators ?? []).join(' | ')
    : 'None configured'

  // ── Section 7: Department Delivery Profiles ───────────────────────────────
  const deptSections = departments.map(d => {
    const whatWeDo = d.what_we_do?.trim() || d.capabilities?.trim() || 'Not specified'
    const specificServices = d.specific_services?.trim()
    const contractTypes = d.contract_types_won?.trim()
    const keywords = d.keywords_synonyms?.trim()

    return `
### ${d.name}
**What This Department Does:**
${whatWeDo}
${specificServices ? `\n**Specific Services:**\n${specificServices}` : ''}
${contractTypes ? `\n**Types of Contracts Won:**\n${contractTypes}` : ''}
${keywords ? `\n**Keywords & Synonyms:**\n${keywords}` : ''}
**Target Sectors:** ${d.target_sectors.join(', ') || 'Not specified'}
${(() => {
  const leadsArr = (d as unknown as { leads?: Array<{ name: string; email: string; capabilities: string[]; is_primary: boolean }> }).leads
  if (leadsArr?.length) {
    const primary = leadsArr.find(l => l.is_primary) ?? leadsArr[0]
    const subLeads = leadsArr.filter(l => !l.is_primary)
    const lines = [`**Primary Lead:** ${primary.name} <${primary.email}>`]
    for (const sl of subLeads) {
      const scope = sl.capabilities?.length ? ` [${sl.capabilities.join(', ')}]` : ''
      lines.push(`**Sub-Lead${scope}:** ${sl.name} <${sl.email}>`)
    }
    return lines.join('\n')
  }
  return `**Department Lead:** ${d.lead_name} <${d.lead_email}>`
})()}`
  }).join('\n')

  // ── Assemble full profile ─────────────────────────────────────────────────
  return `# ${firmName} — Company Intelligence Profile
Generated: ${new Date().toISOString()}

## 1. Company Overview
${profile.company_overview?.trim() || profile.services_description?.trim() || 'Not yet specified.'}

## 2. Core Markets & Sectors
${(profile.core_markets ?? []).length > 0
    ? `The firm actively pursues work in: ${profile.core_markets.join(', ')}`
    : 'Not specified.'}

## 3. Geographical Focus
${profile.geographical_focus?.trim() || 'UK-wide'}

## 4. Departments & Delivery Capabilities
${serviceLinesSections}

## 4b. Strategic Accelerators
Cross-cutting capabilities active across departments: ${acceleratorsSection}

## 5. Contract Filter Settings
- Minimum Value: £${(profile.min_contract_value / 1_000_000).toFixed(1)}m
- Maximum Value: ${maxVal}
- Geographic Scope: ${profile.geographic_scope.join(', ') || 'UK-wide'}
- Preferred Categories: ${profile.preferred_categories.join(', ') || 'All categories'}
- Keywords: ${profile.keywords.join(', ') || 'None set'}
- Exclude Keywords: ${profile.exclude_keywords.join(', ') || 'None set'}

## 6. Intent Mode Settings

### Mode A — Sales / Consultancy Outreach
A contract triggers MODE A (sales opportunity) when:
- Contract value ≥ £${(profile.mode_a_triggers.minValue / 1_000_000).toFixed(1)}m
- Contract types: ${profile.mode_a_triggers.contractTypes.join(', ') || 'Any relevant type'}
- Trigger on: ${profile.mode_a_triggers.awardedOnly ? 'Awarded contracts only' : 'Both published (bidder outreach) and awarded (winner outreach)'}

In Mode A, identify which employees have a prior relationship with the CONTRACT ISSUER or the WINNING ORGANISATION.
The firm is NOT bidding — they are identifying a sales/consultancy opportunity.

### Mode B — Direct Bid
A contract triggers MODE B (bid opportunity) when:
- Contract value ≥ £${(profile.mode_b_triggers.minValue / 1_000_000).toFixed(1)}m
- Contract types: ${profile.mode_b_triggers.contractTypes.join(', ') || 'Any relevant type'}

In Mode B, identify which departments can deliver the contract and assemble the strongest possible bid team.

## 7. Department Delivery Profiles
${deptSections}
`
}

export function classifyIntent(contract: Contract, profile: FirmProfile): IntentMode {
  const modeA = contract.value >= profile.mode_a_triggers.minValue &&
    (profile.mode_a_triggers.contractTypes.length === 0 ||
      profile.mode_a_triggers.contractTypes.some(t =>
        contract.category.toLowerCase().includes(t.toLowerCase())
      ))

  const modeB = contract.value >= profile.mode_b_triggers.minValue &&
    (profile.mode_b_triggers.contractTypes.length === 0 ||
      profile.mode_b_triggers.contractTypes.some(t =>
        contract.category.toLowerCase().includes(t.toLowerCase())
      ))

  if (modeA && modeB) return 'AB'
  if (modeA) return 'A'
  if (modeB) return 'B'
  return null
}

export function contractMatchesProfile(contract: Contract, profile: FirmProfile): boolean {
  if (contract.value < profile.min_contract_value) return false
  if (profile.max_contract_value && contract.value > profile.max_contract_value) return false

  // Exclude contracts issued by competitor organisations
  if ((profile.competitor_names ?? []).length > 0) {
    const issuer = contract.issuer.toLowerCase()
    if (profile.competitor_names.some(n => n.trim() && issuer.includes(n.trim().toLowerCase()))) return false
  }

  const text = `${contract.title} ${contract.description} ${contract.category}`.toLowerCase()

  if (profile.exclude_keywords.some(k => text.includes(k.toLowerCase()))) return false

  if (profile.preferred_categories.length > 0) {
    // Match on the pre-mapped category name OR on keywords for that category found in the contract text.
    const catMatch = profile.preferred_categories.some(c =>
      contract.category.toLowerCase().includes(c.toLowerCase()) ||
      textMatchesCategory(text, c)
    )
    if (!catMatch) {
      // Last chance: an explicit keyword the firm set appears in the contract text
      return profile.keywords.length > 0 &&
        profile.keywords.some(k => text.includes(k.toLowerCase()))
    }
  }

  return true
}
