import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { name, email, firm } = await req.json()
  if (!name || !email || !firm) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('waitlist').insert({ name, email, firm })
  if (error) {
    console.error('[Waitlist] Insert error:', error)
    // Don't surface DB errors to the user — the form succeeds either way
  }

  return NextResponse.json({ ok: true })
}
