import type { Employee, RelationshipScore } from '@/types'

const WEIGHTS = {
  sharedEmployer: 0.50,
  sharedEducation: 0.25,
  geographic: 0.10,
  mutualConnections: 0.15,
}

const STRENGTH_LABELS: { min: number; label: RelationshipScore['strength_label'] }[] = [
  { min: 0.80, label: 'Very Strong' },
  { min: 0.60, label: 'Strong' },
  { min: 0.35, label: 'Moderate' },
  { min: 0.00, label: 'Weak' },
]

function employerScore(employee: Employee, targetOrg: string): number {
  const histories = employee.employment_history ?? []
  const currentYear = new Date().getFullYear()
  let best = 0

  for (const h of histories) {
    if (h.company.toLowerCase().trim() !== targetOrg.toLowerCase().trim()) continue
    const yearLeft = h.to_year ?? currentYear
    const yearsSince = currentYear - yearLeft

    let score: number
    if (yearsSince <= 2) score = 0.80 + Math.random() * 0.14  // 0.80–0.94
    else if (yearsSince <= 5) score = 0.60 + Math.random() * 0.19  // 0.60–0.79
    else if (yearsSince <= 9) score = 0.35 + Math.random() * 0.24  // 0.35–0.59
    else score = 0.10 + Math.random() * 0.24  // 0.10–0.34

    if (score > best) best = score
  }

  return best
}

function educationScore(employee: Employee, _targetOrg: string): number {
  // V1 stub: returns 0 unless Proxycurl enrichment provides shared education data.
  // When Proxycurl is integrated, compare employee.education against known contacts
  // at the target org's university/school.
  if (!employee.education) return 0
  // TODO: integrate Proxycurl contact education data
  return 0
}

function geographicScore(employee: Employee, targetOrgRegion: string): number {
  // V1 stub: compare employee.region (from CSV) against targetOrgRegion
  if (!employee.region || !targetOrgRegion) return 0
  const empRegion = employee.region.toLowerCase()
  const orgRegion = targetOrgRegion.toLowerCase()
  if (empRegion === orgRegion) return 1.0
  if (empRegion.includes(orgRegion) || orgRegion.includes(empRegion)) return 0.7
  return 0
}

function mutualConnectionsScore(_employee: Employee, _targetOrg: string): number {
  // V1 stub: always 0. When Proxycurl is integrated, this uses
  // the mutual connections count from LinkedIn profile data.
  // TODO: integrate Proxycurl mutual_connections field
  return 0
}

function strengthLabel(total: number): RelationshipScore['strength_label'] {
  return STRENGTH_LABELS.find(s => total >= s.min)?.label ?? 'Weak'
}

export function scoreEmployeeForOrg(
  employee: Employee,
  targetOrg: string,
  targetOrgRegion = ''
): RelationshipScore {
  const shared_employer_score = employerScore(employee, targetOrg) * WEIGHTS.sharedEmployer
  const shared_education_score = educationScore(employee, targetOrg) * WEIGHTS.sharedEducation
  const geographic_score = geographicScore(employee, targetOrgRegion) * WEIGHTS.geographic
  const mutual_connections_score = mutualConnectionsScore(employee, targetOrg) * WEIGHTS.mutualConnections

  const total_score = shared_employer_score + shared_education_score + geographic_score + mutual_connections_score

  return {
    employee_id: employee.id,
    target_org: targetOrg,
    shared_employer_score,
    shared_education_score,
    geographic_score,
    mutual_connections_score,
    total_score,
    strength_label: strengthLabel(total_score),
  }
}

export function yearsAtOrg(employee: Employee, org: string): number {
  const histories = employee.employment_history ?? []
  const currentYear = new Date().getFullYear()

  for (const h of histories) {
    if (h.company.toLowerCase().trim() === org.toLowerCase().trim()) {
      const yearLeft = h.to_year ?? currentYear
      return currentYear - yearLeft
    }
  }
  return 999
}
