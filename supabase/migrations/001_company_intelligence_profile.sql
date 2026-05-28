-- Migration 001: Company Intelligence Profile
-- Run this in the Supabase SQL editor against your live database.
-- All columns use IF NOT EXISTS so it is safe to re-run.

-- ─────────────────────────────────────────
-- firm_profiles: structured company intelligence
-- ─────────────────────────────────────────
ALTER TABLE firm_profiles
  ADD COLUMN IF NOT EXISTS company_overview   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS core_markets       text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS geographical_focus text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_lines      jsonb NOT NULL DEFAULT '[]';

-- service_lines JSONB shape (for reference):
-- [
--   {
--     "name": "Programme Management",
--     "description": "We support clients through...",
--     "typical_clients": "Central Government, transport agencies...",
--     "contract_keywords": "PMO, programme delivery, project controls..."
--   }
-- ]

-- ─────────────────────────────────────────
-- departments: rich per-department delivery profiles
-- ─────────────────────────────────────────
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS what_we_do         text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specific_services  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contract_types_won text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS keywords_synonyms  text NOT NULL DEFAULT '';
