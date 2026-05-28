import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { FirmProfile, Department, Employee } from '@/types'
import { ingestFirmContracts } from '@/lib/pipeline/ingestFirmContracts'
import { matchAndAlertContract } from '@/lib/pipeline/matchAndAlertContract'

// Runs the full discovery pipeline for all onboarded firms:
//   ingest new contracts → match against employees → send alerts
//
// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET header.
// Uses service role key — no user session needed.

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: firms, error: firmsError } = await supabase
    .from('firms')
    .select('id, name')
    .eq('onboarding_complete', true)

  if (firmsError) {
    console.error('[Discover] Failed to load firms:', firmsError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const summary = {
    firms: (firms ?? []).length,
    contractsIngested: 0,
    matched: 0,
    noMatch: 0,
    errors: 0,
  }

  for (const firm of firms ?? []) {
    try {
      await processFirm(supabase, firm.id, firm.name, summary)
    } catch (err) {
      console.error(`[Discover] Unhandled error for firm ${firm.id}:`, err)
      summary.errors++
    }
  }

  console.log('[Discover] Run complete:', summary)
  return NextResponse.json(summary)
}

async function processFirm(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  firmId: string,
  firmName: string,
  summary: { contractsIngested: number; matched: number; noMatch: number; errors: number }
) {
  const { data: profileData } = await supabase
    .from('firm_profiles')
    .select('*')
    .eq('firm_id', firmId)
    .single()

  if (!profileData) {
    console.log(`[Discover:${firmName}] No profile — skipping`)
    return
  }

  const profile = profileData as FirmProfile

  const { data: deptData } = await supabase
    .from('departments')
    .select('*')
    .eq('firm_id', firmId)

  const departments = (deptData ?? []) as Department[]

  const { data: empData } = await supabase
    .from('employees')
    .select('*, employment_history(*)')
    .eq('firm_id', firmId)

  const employees = (empData ?? []) as Employee[]

  if (employees.length === 0) {
    console.log(`[Discover:${firmName}] No employees — skipping matching`)
  }

  // Step 1: Determine lookback window.
  // First-ever run (no contracts yet) → 60-day catch-up so the library isn't empty on day one.
  // Subsequent runs → 2 days, matching the daily cron cadence and avoiding redundant AI calls.
  const { count: existingCount } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId)

  const lookbackDays = (existingCount ?? 0) === 0 ? 60 : 2

  const { inserted, newIds } = await ingestFirmContracts(supabase, firmId, profile, departments, lookbackDays)
  console.log(`[Discover:${firmName}] lookback=${lookbackDays}d`)
  summary.contractsIngested += inserted
  console.log(`[Discover:${firmName}] Ingested ${inserted} new contracts`)

  if (newIds.length === 0 || employees.length === 0) return

  // Step 2: Match and alert for each new contract (isolated per contract)
  for (const contractId of newIds) {
    try {
      const outcome = await matchAndAlertContract(
        supabase,
        firmId,
        contractId,
        profile,
        employees,
        departments
      )

      if (outcome === 'matched') summary.matched++
      else if (outcome === 'no_match') summary.noMatch++
      else summary.errors++
    } catch (err) {
      console.error(`[Discover:${firmName}] Contract ${contractId} failed:`, err)
      summary.errors++
    }
  }
}
