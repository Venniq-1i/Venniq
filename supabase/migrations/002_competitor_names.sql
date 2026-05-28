-- Migration 002: Competitor Names
-- Run this in the Supabase SQL editor.
-- Adds the competitor_names column used in the "Avoid These Contracts" section (Step 3 onboarding).
-- IF NOT EXISTS makes it safe to re-run.

ALTER TABLE firm_profiles
  ADD COLUMN IF NOT EXISTS competitor_names text[] NOT NULL DEFAULT '{}';
