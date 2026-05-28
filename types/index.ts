export interface Firm {
  id: string
  owner_id: string
  name: string
  website_url: string | null
  onboarding_complete: boolean
  created_at: string
}

export interface ServiceLine {
  name: string
  service_line: string
  delivery_capabilities: string[]
  description: string
  typical_clients: string
  contract_keywords: string
}

export interface FirmProfile {
  id: string
  firm_id: string
  profile_markdown: string
  services_description: string
  // Structured company intelligence (Level 1)
  company_overview: string
  core_markets: string[]
  geographical_focus: string
  service_lines: ServiceLine[]
  strategic_accelerators: string[]
  // Contract filters
  min_contract_value: number
  max_contract_value: number | null
  preferred_categories: string[]
  keywords: string[]
  exclude_keywords: string[]
  geographic_scope: string[]
  specific_areas: string[]
  competitor_names: string[]
  mode_a_triggers: ModeATriggers
  mode_b_triggers: ModeBTriggers
  contract_sources: ContractSource[]
  updated_at: string
}

export interface ModeATriggers {
  enabled: boolean
  minValue: number
  contractTypes: string[]
  awardedOnly: boolean
}

export interface ModeBTriggers {
  enabled: boolean
  minValue: number
  contractTypes: string[]
}

export interface ContractSource {
  source: string
  label: string
  enabled: boolean
  requiresCredentials: boolean
  credentials?: string
  comingSoon?: boolean
}

export interface DepartmentLead {
  name: string
  email: string
  capabilities: string[]  // which delivery capabilities this lead handles; empty = all
  is_primary: boolean
}

export interface Department {
  id: string
  firm_id: string
  name: string
  capabilities: string
  // Structured department delivery profiles (Level 2)
  what_we_do: string
  specific_services: string
  contract_types_won: string
  keywords_synonyms: string
  target_sectors: string[]
  lead_name: string   // primary lead — kept for backward compat
  lead_email: string  // primary lead — kept for backward compat
  leads: DepartmentLead[]  // full leads list with capability routing
  direct_notify_employees: boolean
}

export interface Employee {
  id: string
  firm_id: string
  department_id: string
  name: string
  email: string
  proxycurl_enriched: boolean
  employment_history?: EmploymentHistory[]
  // Optional enrichment fields from CSV
  education?: string
  region?: string
}

export interface EmploymentHistory {
  id: string
  employee_id: string
  company: string
  from_year: number
  to_year: number | null
}

export interface Contract {
  id: string
  firm_id: string
  external_id: string
  source: string
  title: string
  issuer: string
  value: number
  value_low: number | null
  value_high: number | null
  deadline: string
  category: string
  description: string
  full_description: string | null
  reference: string
  status: 'new' | 'processing' | 'matched' | 'no_match'
  contract_status: string | null
  published_at: string | null
  ingested_at: string
  source_url: string | null
  procurement_stage: 'early_engagement' | 'future_opportunity' | 'opportunity' | 'awarded' | null
  notice_type: string | null
  awarded_supplier: string | null
  awarded_date: string | null
  awarded_value: number | null
  companies_house_url: string | null
  ai_rationale: string | null
  ai_departments: string[]
  ai_confidence: number | null
}

export interface MatchingRun {
  id: string
  firm_id: string
  contract_id: string
  intent_mode: 'A' | 'B' | 'AB'
  ai_response: MatchingResult
  matched_departments: MatchedDepartment[]
  created_at: string
  contract?: Contract
}

export interface MatchingResult {
  contract_id: string
  firm_relevance_note: string
  matched_departments: MatchedDepartment[]
}

export interface MatchedDepartment {
  department: string
  capability_match: string
  reason: string
  candidates: MatchCandidate[]
}

export interface MatchCandidate {
  name: string
  email: string
  last_employer: string
  employed_from: number
  employed_to: number | string
  years_since_left: number
  relationship_strength: 'Very Strong' | 'Strong' | 'Moderate' | 'Weak'
  match_type: 'exact' | 'approximate'
  rationale: string
  confidence_score: number
}

export interface Alert {
  id: string
  matching_run_id: string
  department_id: string
  recipient_email: string
  recipient_name: string
  alert_type: 'dept_head' | 'employee_direct'
  intent_mode: 'A' | 'B'
  sent_at: string
  response_token: string
  status: 'sent' | 'looking' | 'pursuing' | 'not_relevant' | 'no_response'
  response_reason: string | null
  responded_at: string | null
  follow_up_due_at: string | null
  follow_up_sent_at: string | null
  no_response_due_at: string | null
  department?: Department
  matching_run?: MatchingRun
}

export interface RelationshipScore {
  employee_id: string
  target_org: string
  shared_employer_score: number
  shared_education_score: number
  geographic_score: number
  mutual_connections_score: number
  total_score: number
  strength_label: 'Very Strong' | 'Strong' | 'Moderate' | 'Weak'
}

// CSV import shape (raw, before DB write)
export interface EmployeeCSVRow {
  name: string
  email: string
  department: string
  previous_employers: string
  education?: string
  region?: string
}

export interface ParsedEmployee {
  name: string
  email: string
  department: string
  previousEmployers: { company: string; from: number; to: number | null }[]
  education?: string
  region?: string
}

export type IntentMode = 'A' | 'B' | 'AB' | null
