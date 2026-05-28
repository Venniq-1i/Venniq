import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Called by a cron job. Marks dept_head alerts as 'no_response' when:
//   - status = 'sent' (never clicked any button)
//   - no_response_due_at <= now
//
// These appear as non-responses on the leadership dashboard.

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

  const { data, error } = await supabase
    .from('alerts')
    .update({ status: 'no_response' })
    .eq('alert_type', 'dept_head')
    .eq('status', 'sent')
    .lte('no_response_due_at', now)
    .select('id')

  if (error) {
    console.error('[NoResponse] Update error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ marked: (data ?? []).length })
}
