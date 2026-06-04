import { NextRequest, NextResponse } from 'next/server'
import { sendModeAAlert, sendModeBAlert } from '@/lib/email/resend'
import type { Contract, MatchedDepartment } from '@/types'

// Only available in development.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  const to = req.nextUrl.searchParams.get('to') ?? 'ramdomstuff12@gmail.com'

  const contract: Contract = {
    id: 'test-contract-1',
    firm_id: 'test-firm',
    external_id: 'TEST-001',
    source: 'find-a-tender',
    title: 'Strategic Advisory Services for Public Sector Transformation',
    issuer: 'NHS Greater Manchester',
    value: 4_200_000,
    value_low: null,
    value_high: null,
    deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
    category: 'Consultancy',
    description:
      'The Authority is seeking a strategic advisory partner to support a major transformation programme across five NHS trusts. The scope includes operating model redesign, digital readiness assessment, workforce strategy, and change management. The successful partner will embed a small team on-site for up to 18 months.',
    full_description: null,
    reference: 'NHS-GM-2026-001',
    status: 'matched',
    contract_status: 'open',
    published_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    source_url: 'https://www.find-tender.service.gov.uk/Notice/000001',
    procurement_stage: 'opportunity',
    notice_type: null,
    awarded_supplier: null,
    awarded_date: null,
    awarded_value: null,
    companies_house_url: null,
    ai_rationale: null,
    ai_departments: ['Health', 'Digital'],
    ai_confidence: 0.92,
  }

  const healthDept = {
    id: 'dept-health',
    firm_id: 'test-firm',
    name: 'Health',
    capabilities: 'Health strategy, governance, public health advisory',
    what_we_do: 'Health advisory',
    specific_services: 'Strategy, governance',
    contract_types_won: 'Advisory',
    keywords_synonyms: 'NHS, health, public sector',
    target_sectors: ['Healthcare'],
    lead_name: 'Noor Test1',
    lead_email: to,
    leads: [],
    direct_notify_employees: false,
  }

  const digitalDept = {
    id: 'dept-digital',
    firm_id: 'test-firm',
    name: 'Digital',
    capabilities: 'Digital transformation, technology advisory',
    what_we_do: 'Digital advisory',
    specific_services: 'Digital strategy',
    contract_types_won: 'Advisory',
    keywords_synonyms: 'digital, technology',
    target_sectors: ['Healthcare', 'Public Sector'],
    lead_name: 'Sarah Ahmed',
    lead_email: 'sarah.ahmed@firm.com',
    leads: [],
    direct_notify_employees: false,
  }

  const infrastructureDept = {
    id: 'dept-infra',
    firm_id: 'test-firm',
    name: 'Infrastructure',
    capabilities: 'Infrastructure planning, capital projects',
    what_we_do: 'Infrastructure advisory',
    specific_services: 'Capital planning',
    contract_types_won: 'Advisory',
    keywords_synonyms: 'infrastructure, capital',
    target_sectors: ['Public Sector'],
    lead_name: 'James Brown',
    lead_email: 'james.brown@firm.com',
    leads: [],
    direct_notify_employees: false,
  }

  const healthCandidates: MatchedDepartment['candidates'] = [
    {
      name: 'Dr. Emily Carter',
      email: 'emily.carter@firm.com',
      last_employer: 'NHS Greater Manchester',
      employed_from: 2018,
      employed_to: 2022,
      years_since_left: 4,
      relationship_strength: 'Strong',
      match_type: 'exact',
      rationale:
        'Emily led transformation programmes within NHS Greater Manchester from 2018–2022 and has direct relationships with procurement and commissioning leads.',
      confidence_score: 0.88,
    },
    {
      name: 'Marcus Webb',
      email: 'marcus.webb@firm.com',
      last_employer: 'NHS Greater Manchester',
      employed_from: 2015,
      employed_to: 2019,
      years_since_left: 7,
      relationship_strength: 'Moderate',
      match_type: 'approximate',
      rationale:
        'Marcus worked in health strategy at NHS Greater Manchester during a period of significant organisational change, building relationships across multiple trusts.',
      confidence_score: 0.74,
    },
  ]

  const digitalCandidates: MatchedDepartment['candidates'] = [
    {
      name: 'Priya Nair',
      email: 'priya.nair@firm.com',
      last_employer: 'NHS Greater Manchester',
      employed_from: 2020,
      employed_to: 2023,
      years_since_left: 3,
      relationship_strength: 'Very Strong',
      match_type: 'exact',
      rationale:
        'Priya was Digital Programme Lead at NHS Greater Manchester and has direct relationships with the current CIO and the digital transformation team.',
      confidence_score: 0.94,
    },
  ]

  const healthMatchedDept: MatchedDepartment = {
    department: 'Health',
    capability_match: 'DIRECT MATCH: Health strategy, governance, and public health advisory',
    reason:
      "The Health department's expertise in NHS governance and public sector health strategy maps directly onto this contract's transformation brief. The department has won comparable advisory engagements with NHS trusts and is well-positioned to lead or co-deliver.",
    candidates: healthCandidates,
  }

  const digitalMatchedDept: MatchedDepartment = {
    department: 'Digital',
    capability_match: 'SUPPORTING MATCH: Digital transformation and technology advisory',
    reason:
      "The Digital department's readiness assessment and technology advisory capabilities align with the digital component of this transformation programme.",
    candidates: digitalCandidates,
  }

  const infrastructureMatchedDept: MatchedDepartment = {
    department: 'Infrastructure',
    capability_match: 'TANGENTIAL MATCH: Workforce and estate planning overlap',
    reason:
      'The Infrastructure department has relevant experience with NHS estate and workforce planning which is a secondary element of this contract.',
    candidates: [],
  }

  // Co-alerted departments from the perspective of the Health dept
  const coAlertedForHealth = [
    { name: digitalDept.name, leadName: digitalDept.lead_name, leadEmail: digitalDept.lead_email },
    { name: infrastructureDept.name, leadName: infrastructureDept.lead_name, leadEmail: infrastructureDept.lead_email },
  ]

  const responseToken = 'test-token-preview-only'

  const errors: string[] = []

  // Send Mode A test
  try {
    await sendModeAAlert({
      contract,
      dept: healthDept,
      matchedDept: healthMatchedDept,
      responseToken: `${responseToken}-mode-a`,
      advisoryAnalysis:
        "INFERRED MATCH: This contract explicitly seeks a strategic advisory partner for NHS transformation — directly within the Health department's core competency. The combination of operating model redesign and change management is a strong fit for the department's existing NHS client relationships.",
      coAlertedDepts: coAlertedForHealth,
    })
  } catch (err) {
    errors.push(`Mode A: ${String(err)}`)
  }

  // Send Mode B test
  try {
    await sendModeBAlert({
      contract,
      dept: healthDept,
      matchedDept: { ...healthMatchedDept, candidates: healthCandidates },
      responseToken: `${responseToken}-mode-b`,
      coAlertedDepts: coAlertedForHealth,
    })
  } catch (err) {
    errors.push(`Mode B: ${String(err)}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Test Mode A and Mode B alert emails sent to ${to}`,
    coAlertedDepts: coAlertedForHealth.map(d => d.name),
  })
}
