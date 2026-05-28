import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Department, Employee, FirmProfile } from '@/types'
import { matchAndAlertContract } from '@/lib/pipeline/matchAndAlertContract'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { contractId } = await req.json()
  if (!contractId) return NextResponse.json({ error: 'contractId required' }, { status: 400 })

  const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  const { data: profileData } = await supabase
    .from('firm_profiles').select('*').eq('firm_id', firm.id).single()
  if (!profileData) return NextResponse.json({ error: 'Firm profile not configured' }, { status: 400 })
  const profile = profileData as FirmProfile

  const { data: employeesData } = await supabase
    .from('employees').select('*, employment_history(*)').eq('firm_id', firm.id)
  const employees = (employeesData ?? []) as Employee[]

  if (!employees.length) return NextResponse.json({ error: 'No employees loaded' }, { status: 400 })

  const { data: deptData } = await supabase
    .from('departments').select('*').eq('firm_id', firm.id)
  const departments = (deptData ?? []) as Department[]

  const outcome = await matchAndAlertContract(
    supabase as any,
    firm.id,
    contractId,
    profile,
    employees,
    departments
  )

  if (outcome === 'no_match') {
    return NextResponse.json({ status: 'no_match', message: 'Contract does not meet Mode A or B thresholds.' })
  }
  if (outcome === 'error') {
    return NextResponse.json({ error: 'Matching failed — see server logs.' }, { status: 500 })
  }

  return NextResponse.json({ status: 'matched' })
}
