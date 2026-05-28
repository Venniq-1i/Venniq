import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendFollowUpAlert } from '@/lib/email/resend'
import type { Contract, Department, MatchedDepartment } from '@/types'

// Called by a cron job (e.g. Vercel Cron or external scheduler).
// Sends follow-up emails for dept_head alerts that are:
//   - status = 'looking'
//   - follow_up_due_at <= now
//   - follow_up_sent_at is null (not yet sent)
//
// Protect with CRON_SECRET to prevent unauthenticated calls.

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  const { data: dueAlerts, error } = await supabase
    .from('alerts')
    .select('*, matching_runs(*, contracts(*)), departments(*)')
    .eq('alert_type', 'dept_head')
    .eq('status', 'looking')
    .lte('follow_up_due_at', now)
    .is('follow_up_sent_at', null)
    .limit(50)

  if (error) {
    console.error('[Followup] Query error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const alert of dueAlerts ?? []) {
    const run = (alert as any).matching_runs
    const dept = (alert as any).departments as Department
    const contract = run?.contracts as Contract

    if (!run || !dept || !contract) continue

    // Find the specific matched department from the run
    const matchedDept = (run.matched_departments as MatchedDepartment[])
      .find(d => d.department === dept.name)

    if (!matchedDept) continue

    const daysSinceSent = Math.round(
      (Date.now() - new Date(alert.sent_at).getTime()) / 86400000
    )

    try {
      await sendFollowUpAlert({
        contract,
        dept,
        matchedDept,
        responseToken: alert.response_token,
        intentMode: alert.intent_mode as 'A' | 'B',
        daysSinceSent,
      })

      await supabase
        .from('alerts')
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq('id', alert.id)

      sent++
    } catch (err) {
      console.error('[Followup] Failed for alert', alert.id, err)
      failed++
    }
  }

  return NextResponse.json({ sent, failed, processed: (dueAlerts ?? []).length })
}
