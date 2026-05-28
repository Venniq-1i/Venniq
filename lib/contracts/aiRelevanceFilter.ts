import Anthropic from '@anthropic-ai/sdk'
import type { Department, FirmProfile } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Fallback descriptions used when a department has no configured fields.
const DEPT_SERVICE_MAP: Record<string, string> = {
  'Infrastructure': `Civil and structural engineering advisory, infrastructure planning and programme delivery, transport and utilities consulting, technical due diligence, asset condition assessment, and oversight of major capital works including rail, highways, bridges, energy networks, and water infrastructure.`,
  'Digital / Technology': `Digital transformation strategy, IT programme management, software procurement and vendor selection advisory, data strategy and governance, cyber security advisory, cloud migration planning, AI and automation consulting, technology due diligence, enterprise architecture, and ICT systems integration oversight.`,
  'Finance / Advisory': `Financial advisory, commercial management, business case development (HM Treasury Green Book), value-for-money analysis, investment appraisal, public sector finance, treasury advisory, benefits realisation, audit readiness, and economic consulting.`,
  'Property / Advisory': `Property advisory, estate strategy, facilities management consulting, public sector asset management, real estate transaction support, planning and development advisory, site feasibility, RICS-grade surveying, and building lease/disposal advisory.`,
  'Infrastructure / PMO': `Programme and Project Management Office (PMO) setup and operation, P3M3 advisory, delivery assurance, schedule and risk management, portfolio governance, programme recovery, and Integrated Assurance and Approvals Planning (IAAP).`,
  'Construction': `Construction management, contractor procurement and tendering support, quantity surveying, cost management and cost planning, NEC/JCT contract administration, site supervision, project monitoring on behalf of funders, and building works advisory.`,
  'Legal / Compliance': `Legal advisory (non-contentious), contract drafting and management, procurement law, regulatory compliance, governance frameworks, risk management frameworks, data protection advisory, and public sector legal support.`,
  'HR / Workforce': `Human resources strategy, workforce planning and redesign, organisational design, talent management, succession planning, executive recruitment advisory, learning and development strategy, HR transformation, and TUPE advisory.`,
  'Marketing / Communications': `Strategic communications, public affairs and stakeholder engagement, public consultation design and delivery, brand strategy, content production, media relations, and crisis communications.`,
}

/**
 * Builds a focused intelligence card for a single department.
 * Uses all available structured fields — not just the first two.
 */
function buildDepartmentCard(dept: Department): string {
  const parts: string[] = []

  const whatWeDo = dept.what_we_do?.trim() || dept.capabilities?.trim()
  if (whatWeDo) parts.push(whatWeDo)

  if (dept.specific_services?.trim()) parts.push(`**Specific services:** ${dept.specific_services.trim()}`)
  if (dept.contract_types_won?.trim()) parts.push(`**Contract types we have won:** ${dept.contract_types_won.trim()}`)
  if (dept.keywords_synonyms?.trim()) parts.push(`**Search terms / synonyms:** ${dept.keywords_synonyms.trim()}`)
  if ((dept.target_sectors ?? []).length > 0) parts.push(`**Target sectors:** ${dept.target_sectors.join(', ')}`)

  if (parts.length > 0) return parts.join('\n')

  // Last resort: hardcoded map
  for (const [key, desc] of Object.entries(DEPT_SERVICE_MAP)) {
    if (dept.name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(dept.name.toLowerCase())) {
      return desc
    }
  }
  return `Professional services and advisory in the ${dept.name} domain.`
}

export interface AIRelevanceResult {
  contractId: string
  relevant: boolean
  confidence: number
  rationale: string
  relevantDepartments: string[]
}

interface ContractInput {
  id: string
  title: string
  description: string
  value: number
  issuer: string
}

interface DeptRawResult {
  contractIndex: number
  relevant: boolean
  confidence: number
  rationale: string
}

const BATCH_SIZE = 20

/**
 * Evaluates a batch of contracts against a single department's system prompt.
 * Returns a lightweight result per contract — no relevantDepartments here,
 * that is built by the merge step in aiFilterContracts.
 */
async function evaluateDepartmentBatch(
  batch: ContractInput[],
  systemPrompt: string,
  deptName: string
): Promise<DeptRawResult[]> {
  const contractList = batch
    .map((c, i) =>
      `[${i}] TITLE: ${c.title}\nISSUER: ${c.issuer}\nVALUE: £${(c.value / 1000).toFixed(0)}k\nDESCRIPTION: ${(c.description ?? '').slice(0, 600) || 'No description provided.'}`
    )
    .join('\n\n---\n\n')

  const userPrompt = `Evaluate these ${batch.length} contracts for relevance to the ${deptName} department. Return ONLY a valid JSON array — no markdown, no explanation outside the array.\n\n${contractList}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content.find(c => c.type === 'text')?.text ?? ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)

  if (!jsonMatch) {
    console.error(`[AIFilter:${deptName}] Could not parse JSON. Response:`, text.slice(0, 300))
    // Safe fallback: treat all as not relevant for this dept rather than defaulting to relevant
    return batch.map((_, i) => ({ contractIndex: i, relevant: false, confidence: 0, rationale: '' }))
  }

  const parsed = JSON.parse(jsonMatch[0]) as DeptRawResult[]
  return parsed.filter(r => typeof r.contractIndex === 'number')
}

/**
 * Filters contracts for relevance by evaluating each department independently.
 *
 * Each department gets its own focused Claude call — a short, precise prompt
 * describing only that department's capabilities. Claude answers:
 * "Which of these contracts could THIS department deliver or create a sales opportunity from?"
 *
 * Results are merged across departments:
 *   - A contract passes if ANY department marks it relevant
 *   - ai_confidence = highest confidence across all departments that said yes
 *   - ai_rationale  = rationale from the highest-confidence department
 *   - relevantDepartments = every department name that said yes (accurate, not inferred)
 *
 * Falls back to a single firm-level pass if no departments are configured.
 */
export async function aiFilterContracts(
  contracts: ContractInput[],
  profile: FirmProfile,
  departments: Department[]
): Promise<AIRelevanceResult[]> {
  if (contracts.length === 0) return []

  const exclusionBlock = (profile.competitor_names ?? []).length > 0
    ? `\n## Organisations to EXCLUDE\nDo NOT flag contracts issued by any of these — they are competitors or excluded issuers:\n${profile.competitor_names.join(', ')}\n`
    : ''

  // ── No departments configured: single firm-level pass (onboarding edge case) ──
  if (departments.length === 0) {
    return firmLevelFallback(contracts, profile, exclusionBlock)
  }

  // ── Per-department evaluation ─────────────────────────────────────────────────
  // merged: contractId → best result so far + accumulated department names
  const merged = new Map<string, AIRelevanceResult>()

  for (const dept of departments) {
    const card = buildDepartmentCard(dept)

    const systemPrompt = `You are a senior BD director for the **${dept.name}** department of a UK professional services firm.

## What Our Department Does
${card}
${exclusionBlock}
## Your Task
Review the contracts below and identify which ones our department could:
- **Deliver directly** — we have the capability and would bid for this contract
- **Advise on or support** — we could provide specialist input to whoever wins
- **Use as a sales signal** — an awarded contract where the winner may need our support

Only mark a contract as relevant if there is a **genuine, specific commercial angle for the ${dept.name} department**. Do not mark it relevant simply because it is a large or prominent contract.

For each contract return:
- contractIndex: the number in square brackets [N]
- relevant: true or false
- confidence: 0–100 (how certain you are this is a real opportunity for this department)
- rationale: 2–3 sentences for a BD professional — explain the specific opportunity for ${dept.name}, not just what the contract is about

Return ONLY a valid JSON array. No markdown fences. No explanation outside the array.`

    // Paginate through all contracts in batches
    for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
      const batch = contracts.slice(i, i + BATCH_SIZE)
      const batchOffset = i

      const deptResults = await evaluateDepartmentBatch(batch, systemPrompt, dept.name)

      for (const r of deptResults) {
        if (!r.relevant) continue
        const contract = batch[r.contractIndex]
        if (!contract) continue

        const existing = merged.get(contract.id)
        if (!existing) {
          merged.set(contract.id, {
            contractId: contract.id,
            relevant: true,
            confidence: r.confidence ?? 50,
            rationale: r.rationale ?? '',
            relevantDepartments: [dept.name],
          })
        } else {
          // This department also claims this contract
          if (!existing.relevantDepartments.includes(dept.name)) {
            existing.relevantDepartments.push(dept.name)
          }
          // Promote to higher-confidence department's rationale
          if ((r.confidence ?? 0) > existing.confidence) {
            existing.confidence = r.confidence
            existing.rationale = r.rationale
          }
        }
      }

      console.log(`[AIFilter] dept="${dept.name}" batch=${batchOffset}–${batchOffset + batch.length - 1} relevant=${deptResults.filter(r => r.relevant).length}`)
    }
  }

  return Array.from(merged.values())
}

// ── Fallback: single firm-level pass when no departments are set up ────────────

async function firmLevelFallback(
  contracts: ContractInput[],
  profile: FirmProfile,
  exclusionBlock: string
): Promise<AIRelevanceResult[]> {
  const firmIntelligence = profile.profile_markdown?.trim()
    || profile.company_overview?.trim()
    || profile.services_description?.trim()
    || 'A UK professional services firm.'

  const systemPrompt = `You are a senior business development director evaluating UK government procurement contracts for commercial relevance.

## Firm Intelligence Profile
${firmIntelligence}
${exclusionBlock}
## How to Evaluate
Think like an experienced BD professional. What services will this contract realistically require — even if not explicitly named? Only mark NOT relevant if clearly outside the firm's capabilities (e.g. catering, vehicle fleet, pharmaceutical supply).

For each contract return: contractIndex, relevant (true/false), confidence (0–100), rationale (2–3 sentences), relevantDepartments (empty array).

Return ONLY a valid JSON array. No markdown fences.`

  const results: AIRelevanceResult[] = []
  for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
    const batch = contracts.slice(i, i + BATCH_SIZE)
    const contractList = batch
      .map((c, idx) =>
        `[${idx}] TITLE: ${c.title}\nISSUER: ${c.issuer}\nVALUE: £${(c.value / 1000).toFixed(0)}k\nDESCRIPTION: ${(c.description ?? '').slice(0, 600) || 'No description provided.'}`
      )
      .join('\n\n---\n\n')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Evaluate these ${batch.length} contracts.\n\n${contractList}` }],
    })

    const text = response.content.find(c => c.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) continue

    type RawResult = { contractIndex: number; relevant: boolean; confidence: number; rationale: string; relevantDepartments: string[] }
    const parsed = JSON.parse(jsonMatch[0]) as RawResult[]
    for (const r of parsed) {
      const contract = batch[r.contractIndex]
      if (contract && r.relevant) {
        results.push({
          contractId: contract.id,
          relevant: true,
          confidence: r.confidence ?? 50,
          rationale: r.rationale ?? '',
          relevantDepartments: r.relevantDepartments ?? [],
        })
      }
    }
  }
  return results
}
