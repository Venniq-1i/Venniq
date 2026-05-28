-- Crendora V1 — Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- FIRMS
-- ─────────────────────────────────────────
create table if not exists firms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  website_url text,
  onboarding_complete boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table firms enable row level security;
create policy "Firm owner access" on firms
  for all using (auth.uid() = owner_id);

-- ─────────────────────────────────────────
-- FIRM PROFILES (persistent AI reference config)
-- ─────────────────────────────────────────
create table if not exists firm_profiles (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references firms(id) on delete cascade,
  profile_markdown      text not null default '',
  services_description  text not null default '',
  -- Structured company intelligence (Level 1)
  company_overview      text not null default '',
  core_markets          text[] not null default '{}',
  geographical_focus    text not null default '',
  service_lines         jsonb not null default '[]',
  -- Contract filters
  min_contract_value    numeric not null default 500000,
  max_contract_value    numeric,
  preferred_categories  text[] not null default '{}',
  keywords              text[] not null default '{}',
  exclude_keywords      text[] not null default '{}',
  geographic_scope      text[] not null default '{''England''}',
  mode_a_triggers       jsonb not null default '{"enabled": true, "minValue": 1000000, "contractTypes": [], "awardedOnly": false}',
  mode_b_triggers       jsonb not null default '{"enabled": true, "minValue": 500000, "contractTypes": []}',
  contract_sources      jsonb not null default '[{"source": "contracts_finder", "label": "UK Contracts Finder", "enabled": true, "requiresCredentials": false}]',
  specific_areas        text[] not null default '{}',
  competitor_names      text[] not null default '{}',
  updated_at            timestamptz not null default now(),
  unique (firm_id)
);

alter table firm_profiles enable row level security;
create policy "Firm profile owner access" on firm_profiles
  for all using (
    firm_id in (select id from firms where owner_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────
create table if not exists departments (
  id                       uuid primary key default gen_random_uuid(),
  firm_id                  uuid not null references firms(id) on delete cascade,
  name                     text not null,
  capabilities             text not null default '',
  -- Structured department delivery profiles (Level 2)
  what_we_do               text not null default '',
  specific_services        text not null default '',
  contract_types_won       text not null default '',
  keywords_synonyms        text not null default '',
  target_sectors           text[] not null default '{}',
  lead_name                text not null default '',
  lead_email               text not null default '',
  direct_notify_employees  boolean not null default false
);

alter table departments enable row level security;
create policy "Department owner access" on departments
  for all using (
    firm_id in (select id from firms where owner_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────
create table if not exists employees (
  id                  uuid primary key default gen_random_uuid(),
  firm_id             uuid not null references firms(id) on delete cascade,
  department_id       uuid references departments(id) on delete set null,
  name                text not null,
  email               text not null,
  education           text,
  region              text,
  proxycurl_enriched  boolean not null default false
);

alter table employees enable row level security;
create policy "Employee owner access" on employees
  for all using (
    firm_id in (select id from firms where owner_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- EMPLOYMENT HISTORY
-- ─────────────────────────────────────────
create table if not exists employment_history (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  company      text not null,
  from_year    integer not null,
  to_year      integer  -- null means 'present'
);

alter table employment_history enable row level security;
create policy "Employment history owner access" on employment_history
  for all using (
    employee_id in (
      select id from employees
      where firm_id in (select id from firms where owner_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
-- CONTRACTS
-- ─────────────────────────────────────────
create table if not exists contracts (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references firms(id) on delete cascade,
  external_id  text not null,
  source       text not null default 'contracts_finder',
  title        text not null,
  issuer       text not null,
  value        numeric not null default 0,
  deadline     date,
  category     text not null default '',
  description  text not null default '',
  reference    text not null default '',
  status            text not null default 'new' check (status in ('new', 'processing', 'matched', 'no_match')),
  contract_status   text,
  published_at      timestamptz,
  deadline_raw      text,
  ingested_at       timestamptz not null default now(),
  value_low         numeric,
  value_high        numeric,
  source_url        text,
  full_description  text,
  procurement_stage text check (procurement_stage in ('early_engagement', 'future_opportunity', 'opportunity', 'awarded')),
  notice_type       text,
  awarded_supplier  text,
  awarded_date      date,
  awarded_value     numeric,
  companies_house_url text,
  ai_rationale      text,
  ai_departments    text[] not null default '{}',
  ai_confidence     integer,
  unique (firm_id, external_id, source)
);

alter table contracts enable row level security;
create policy "Contract owner access" on contracts
  for all using (
    firm_id in (select id from firms where owner_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- MATCHING RUNS
-- ─────────────────────────────────────────
create table if not exists matching_runs (
  id                   uuid primary key default gen_random_uuid(),
  firm_id              uuid not null references firms(id) on delete cascade,
  contract_id          uuid not null references contracts(id) on delete cascade,
  intent_mode          text not null check (intent_mode in ('A', 'B', 'AB')),
  ai_response          jsonb not null default '{}',
  matched_departments  jsonb not null default '[]',
  created_at           timestamptz not null default now()
);

alter table matching_runs enable row level security;
create policy "Matching run owner access" on matching_runs
  for all using (
    firm_id in (select id from firms where owner_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- ALERTS
-- ─────────────────────────────────────────
create table if not exists alerts (
  id                  uuid primary key default gen_random_uuid(),
  matching_run_id     uuid not null references matching_runs(id) on delete cascade,
  department_id       uuid references departments(id) on delete set null,
  recipient_email     text not null,
  recipient_name      text not null,
  alert_type          text not null check (alert_type in ('dept_head', 'employee_direct')),
  intent_mode         text not null check (intent_mode in ('A', 'B')),
  sent_at             timestamptz not null default now(),
  response_token      text not null unique default gen_random_uuid()::text,
  status              text not null default 'sent' check (status in ('sent', 'looking', 'pursuing', 'not_relevant', 'no_response')),
  response_reason     text,
  responded_at        timestamptz,
  follow_up_due_at    timestamptz,
  follow_up_sent_at   timestamptz,
  no_response_due_at  timestamptz
);

alter table alerts enable row level security;
-- Alerts are readable by the firm owner; response_token endpoint uses service role
create policy "Alert owner access" on alerts
  for all using (
    matching_run_id in (
      select id from matching_runs
      where firm_id in (select id from firms where owner_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index if not exists idx_contracts_firm_status on contracts(firm_id, status);
create index if not exists idx_matching_runs_firm on matching_runs(firm_id);
create index if not exists idx_alerts_token on alerts(response_token);
create index if not exists idx_alerts_matching_run on alerts(matching_run_id);
create index if not exists idx_employment_history_employee on employment_history(employee_id);
create index if not exists idx_employees_firm on employees(firm_id);
create index if not exists idx_alerts_follow_up on alerts(follow_up_due_at) where follow_up_sent_at is null and status = 'looking';
create index if not exists idx_alerts_no_response on alerts(no_response_due_at) where status = 'sent';
