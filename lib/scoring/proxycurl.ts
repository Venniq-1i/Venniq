import type { ParsedEmployee } from '@/types'

// TODO: Integrate Proxycurl API to enrich employee profiles with:
// - Full employment history (from LinkedIn)
// - Education history (university, graduation year)
// - Current location / region
// - Mutual connections count with target organisations
//
// API docs: https://nubela.co/proxycurl/docs
// Cost: ~£0.01 per profile lookup
// Set PROXYCURL_API_KEY in .env.local when ready

export async function enrichEmployees(employees: ParsedEmployee[]): Promise<ParsedEmployee[]> {
  // V1 stub: returns employees unchanged — CSV data is used as-is
  console.log(`[Proxycurl] Enrichment stub called for ${employees.length} employees. Integration pending.`)
  return employees
}
