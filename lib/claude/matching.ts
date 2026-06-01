import Anthropic from '@anthropic-ai/sdk'
import type { Contract, Employee, FirmProfile, MatchingResult } from '@/types'

const MODEL = 'claude-sonnet-4-6'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Pre-filter for Mode A: checks whether a contract plausibly requires
 * consultancy, advisory, management, oversight, or professional services.
 * Uses Haiku for cost/speed — this is a binary gate, not a deep analysis.
 */
export async function checkModeAConsultancyFit(contract: Contract): Promise<boolean> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `You are evaluating whether a UK government procurement contract requires consultancy, advisory, management, oversight, assurance, or professional services as part of its delivery — either from the prime contractor or alongside them.

Contract title: ${contract.title}
Category: ${contract.category}
Description: ${(contract.description ?? '').slice(0, 500)}

Reply ONLY with valid JSON (no markdown): { "eligible": true, "reason": "one sentence" } or { "eligible": false, "reason": "one sentence" }`

  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content.find(c => c.type === 'text')?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return true // default to eligible on parse failure
    const parsed = JSON.parse(match[0]) as { eligible: boolean; reason: string }
    console.log(`[ModeA:consultancyCheck] eligible=${parsed.eligible} — ${parsed.reason}`)
    return parsed.eligible
  } catch {
    return true // default to eligible on error
  }
}

function formatEmployer(e: { company: string; from_year: number; to_year: number | null }) {
  return `${e.company} (${e.from_year}–${e.to_year === null ? 'present' : e.to_year})`
}

export async function matchContractToEmployees(
  contract: Contract,
  employees: Employee[],
  profile: FirmProfile,
  profileMarkdown: string,
  intentMode: 'A' | 'B' | 'AB'
): Promise<MatchingResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const currentYear = new Date().getFullYear()

  const employeeList = employees.map(e => {
    const history = (e.employment_history ?? []).map(formatEmployer).join(', ')
    const extra = [
      e.education ? `Education: ${e.education}` : '',
      e.region ? `Region: ${e.region}` : '',
    ].filter(Boolean).join(' | ')
    return `- ${e.name} (${e.email}) | Dept: see profile | History: ${history || 'None recorded'}${extra ? ' | ' + extra : ''}`
  }).join('\n')

  const isAwarded = contract.procurement_stage === 'awarded'
  const winnerContext = isAwarded && contract.awarded_supplier
    ? `\nAWARDED CONTRACT INTELLIGENCE:
This contract has already been awarded to: ${contract.awarded_supplier}${contract.awarded_value ? ` (confirmed value: £${(contract.awarded_value / 1_000_000).toFixed(2)}m)` : ''}${contract.awarded_date ? `, awarded ${contract.awarded_date}` : ''}.
When scanning employee records, use "${contract.awarded_supplier}" as your PRIMARY matching target — prioritise employees whose employment history includes this organisation.
Also attempt fuzzy matching for common name variations (e.g. "Highways England" / "National Highways", "Department for Transport" / "DfT"). If a match is approximate rather than exact, flag it clearly with match_type: "approximate" and explain the variation.
Context for the alert recipient: This contract has been awarded. Staff who previously worked at the winning organisation may have existing relationships that could support future phases, renewals, framework call-offs, or related subcontracting opportunities.`
    : ''

  const includeWinnerAnalysis = (intentMode === 'A' || intentMode === 'AB') &&
    isAwarded && contract.awarded_supplier &&
    (profile.mode_a_triggers.includeWinnerAnalysis ?? true)

  const advisoryAnalysisInstruction = includeWinnerAnalysis
    ? `\n\nADVISORY OPPORTUNITY ANALYSIS REQUIRED:
Populate the advisory_opportunity_analysis field with 2–3 sentences explaining what consultancy or professional services ${contract.awarded_supplier} is likely to need to deliver this contract. Be specific to the contract type and scale (e.g. programme oversight, cost management, environmental advisory, stakeholder engagement). Do not speculate beyond realistic service needs. This will be shown to BD staff in the alert email under the heading "Advisory Opportunity Analysis".`
    : ''

  const modeInstructions = {
    A: `MODE A — SALES OPPORTUNITY${winnerContext}
This contract signals that the winner or serious bidder will need external consultancy, advisory, or specialist support services.
Your firm is NOT bidding directly on this contract.
FOCUS: Identify which employees have a prior relationship with the ISSUING ORGANISATION${isAwarded && contract.awarded_supplier ? ` or the WINNING ORGANISATION (${contract.awarded_supplier})` : ' or likely WINNING ORGANISATION'}.
The alert email will frame this as a sales opportunity — not a bid.${advisoryAnalysisInstruction}`,
    B: `MODE B — DIRECT BID${winnerContext}
This contract is something the firm should consider bidding on directly.
FOCUS: Identify which departments can deliver the contract, and assemble the strongest possible bid team.
Surface employees with prior relationships at the issuing organisation${isAwarded && contract.awarded_supplier ? ` and at the winning organisation (${contract.awarded_supplier})` : ''} as bid team candidates.`,
    AB: `MODE A + B — DUAL OPPORTUNITY${winnerContext}
This contract triggers BOTH modes simultaneously.
Generate results covering BOTH:
1. Sales/consultancy outreach (Mode A) — who at the issuing org or winning org do we know?
2. Direct bid opportunity (Mode B) — which departments should bid, and who builds the team?${advisoryAnalysisInstruction}`,
  }

  const systemPrompt = `You are Venniq's AI matching engine — an Opportunity Intelligence Platform used by large professional services firms.

Your job: analyse a procurement contract against the firm's department capabilities and employee employment histories to identify cross-divisional revenue opportunities.

${profileMarkdown}

INTENT FOR THIS CONTRACT:
${modeInstructions[intentMode]}

LIFECYCLE REASONING INSTRUCTIONS:
When analysing a contract, reason about what the full lifecycle of DELIVERING it will require — not just what is explicitly named in the contract description.

Examples:
- A major capital infrastructure programme will require PMO, cost management, commercial management, procurement advisory, and risk support — even if none of these are mentioned.
- A digital transformation contract will need organisational change, HR workforce planning, and communications alongside the technology work.
- A large public sector procurement will require legal/compliance and governance advisory.

Cross-reference the firm's SERVICE LINES (Section 4 of the profile) first to determine broad relevance, then use DEPARTMENT DELIVERY PROFILES (Section 7) to route to the right team.

For each matched department, your capability_match field MUST clearly state one of:
- EXPLICIT MATCH: The contract description directly names a service this department offers — quote the specific language used in the contract.
- INFERRED MATCH: Based on the contract's scale, nature, or issuer type, this department's services will realistically be needed — explain the reasoning in one clear sentence.

DEPARTMENT RELEVANCE RULES:
- Match departments based on both their stated capabilities AND the inferred service needs of the contract lifecycle.
- Do not limit yourself to departments explicitly named in the contract — reason about what the full programme will need.
- Provide specific reasons referencing both contract requirements and department service descriptions.

CANDIDATE IDENTIFICATION RULES:
- Only flag an employee if they worked at the exact issuing organisation (or a very close legal entity, e.g. "NHS Digital" is part of NHS England).
- Do NOT match partial name similarities.
- Rank candidates by recency first, then inferred seniority.
- Return top 1–2 candidates per matched department.
- Use relationship_strength: Very Strong (left 0–2 yrs) | Strong (3–5 yrs) | Moderate (6–9 yrs) | Weak (10+ yrs)

Current year: ${currentYear}`

  const userPrompt = `Analyse this contract:

TITLE: ${contract.title}
ISSUING ORGANISATION: ${contract.issuer}
PROCUREMENT STAGE: ${contract.procurement_stage ?? 'opportunity'}${contract.awarded_supplier ? `\nAWARDED TO: ${contract.awarded_supplier}` : ''}${contract.awarded_value ? `\nAWARDED VALUE: £${(contract.awarded_value / 1_000_000).toFixed(2)}m` : ''}
CATEGORY: ${contract.category}
VALUE: £${(contract.value / 1_000_000).toFixed(1)}m
DEADLINE: ${contract.deadline ?? 'Not specified'}
DESCRIPTION: ${contract.description}

EMPLOYEE LIST:
${employeeList}

Use record_matches to record your findings.`

  const matchingTool: Anthropic.Tool = {
    name: 'record_matches',
    description: 'Record matched departments and recommended outreach candidates for this contract.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contract_id: { type: 'string' as const },
        firm_relevance_note: {
          type: 'string' as const,
          description: 'How well this contract fits the firm\'s pursuit criteria',
        },
        advisory_opportunity_analysis: {
          type: 'string' as const,
          description: 'Mode A awarded contracts only: 2–3 sentences on what consultancy services the winning company is likely to need. Omit if not applicable.',
        },
        matched_departments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              department:       { type: 'string' as const },
              capability_match: { type: 'string' as const },
              reason:           { type: 'string' as const },
              candidates: {
                type: 'array' as const,
                items: {
                  type: 'object' as const,
                  properties: {
                    name:                  { type: 'string' as const },
                    email:                 { type: 'string' as const },
                    last_employer:         { type: 'string' as const },
                    employed_from:         { type: 'number' as const },
                    employed_to:           { type: 'string' as const },
                    years_since_left:      { type: 'number' as const },
                    relationship_strength: { type: 'string' as const, enum: ['Very Strong', 'Strong', 'Moderate', 'Weak'] },
                    match_type:            { type: 'string' as const, enum: ['exact', 'approximate'], description: 'Whether the employer name match is exact or an approximate/known alias' },
                    rationale:             { type: 'string' as const },
                    confidence_score:      { type: 'number' as const },
                  },
                  required: ['name', 'email', 'last_employer', 'employed_from', 'employed_to',
                             'years_since_left', 'relationship_strength', 'match_type', 'rationale', 'confidence_score'],
                },
              },
            },
            required: ['department', 'capability_match', 'reason', 'candidates'],
          },
        },
      },
      required: ['contract_id', 'firm_relevance_note', 'matched_departments'],
    },
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    tools: [matchingTool],
    tool_choice: { type: 'tool', name: 'record_matches' },
    messages: [{ role: 'user', content: userPrompt }],
  })

  const toolUse = response.content.find(c => c.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No structured result returned from Claude.')
  }

  return { ...(toolUse.input as MatchingResult), contract_id: contract.id }
}
