import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FirmProfile, Department } from '@/types'
import { ingestFirmContracts } from '@/lib/pipeline/ingestFirmContracts'

export const maxDuration = 300 // 5 minutes — requires Vercel Pro

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  const { data: profileData } = await supabase
    .from('firm_profiles')
    .select('*')
    .eq('firm_id', firm.id)
    .single()

  if (!profileData) return NextResponse.json({ error: 'Profile not configured' }, { status: 400 })
  const profile = profileData as FirmProfile

  const { data: deptData } = await supabase
    .from('departments')
    .select('*')
    .eq('firm_id', firm.id)

  const departments = (deptData ?? []) as Department[]

  const result = await ingestFirmContracts(supabase as any, firm.id, profile, departments, 14, true)

  return NextResponse.json({
    rawFetched: result.rawFetched,
    filtered: result.filtered,
    ingested: result.inserted,
  })
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('firm_id', firm.id)
    .in('status', ['new', 'matched', 'no_match'])
    .order('ingested_at', { ascending: false })

  return NextResponse.json({ contracts: contracts ?? [] })
}
