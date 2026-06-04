import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendModeBAlert, sendModeAAlert, sendEmployeeDirectAlert } from '@/lib/email/resend'
import type { Contract, Department, Employee, MatchingRun } from '@/types'
import { randomUUID } from 'crypto'

// Configurable windows (days). Defaults: follow-up after 3 days, no-response flag after 7.
const FOLLOW_UP_DAYS = parseInt(process.env.ALERT_FOLLOW_UP_DAYS ?? '3', 10)
const NO_RESPONSE_DAYS = parseInt(process.env.ALERT_NO_RESPONSE_DAYS ?? '7', 10)

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { runId } = await req.json()
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

  const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  const { data: run } = await supabase
    .from('matching_runs')
    .select('*, contracts(*)')
    .eq('id', runId)
    .eq('firm_id', firm.id)
    .single()

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  const matchingRun = run as MatchingRun & { contracts: Contract }
  const contract = matchingRun.contracts

  const { data: depts } = await supabase.from('departments').select('*').eq('firm_id', firm.id)
  const departments = (depts ?? []) as Department[]

  const { data: emps } = await supabase.from('employees').select('*, employment_history(*)').eq('firm_id', firm.id)
  const employees = (emps ?? []) as Employee[]

  const sentAlerts: string[] = []
  const modes = matchingRun.intent_mode === 'AB' ? ['A', 'B'] : [matchingRun.intent_mode]

  for (const mode of modes as ('A' | 'B')[]) {
    for (const matchedDept of matchingRun.matched_departments) {
      const dept = departments.find(d => d.name === matchedDept.department)
      if (!dept) continue

      const responseToken = randomUUID()

      const filteredCandidates = matchedDept.candidates.filter(c => {
        const emp = employees.find(e => e.email === c.email)
        return emp && emp.department_id === dept.id
      })
      const scopedMatchedDept = { ...matchedDept, candidates: filteredCandidates }

      const coAlertedDepts = matchingRun.matched_departments
        .filter(md => md.department !== matchedDept.department)
        .map(md => {
          const d = departments.find(dep => dep.name === md.department)
          return d ? { name: d.name, leadName: d.lead_name, leadEmail: d.lead_email } : null
        })
        .filter((d): d is { name: string; leadName: string; leadEmail: string } => d !== null)

      const { data: alertRecord } = await supabase.from('alerts').insert({
        matching_run_id: runId,
        department_id: dept.id,
        recipient_email: dept.lead_email,
        recipient_name: dept.lead_name,
        alert_type: 'dept_head',
        intent_mode: mode,
        response_token: responseToken,
        status: 'sent',
        no_response_due_at: daysFromNow(NO_RESPONSE_DAYS),
      }).select('id').single()

      if (alertRecord) sentAlerts.push(alertRecord.id)

      try {
        if (mode === 'B') {
          await sendModeBAlert({ contract, dept, matchedDept: scopedMatchedDept, responseToken, coAlertedDepts })
        } else {
          await sendModeAAlert({ contract, dept, matchedDept: scopedMatchedDept, responseToken, coAlertedDepts })
        }
      } catch (err) {
        console.error('[Alerts] Email send failed:', err)
      }

      if (dept.direct_notify_employees && matchedDept.candidates.length > 0) {
        for (const candidate of matchedDept.candidates) {
          const emp = employees.find(e => e.email === candidate.email)
          if (!emp) continue

          const colleagues = matchedDept.candidates
            .filter(c => c.email !== candidate.email)
            .map(c => ({ name: c.name, relationship_strength: c.relationship_strength }))

          try {
            await sendEmployeeDirectAlert({
              contract,
              employee: { name: candidate.name, email: candidate.email },
              deptLead: { name: dept.lead_name, email: dept.lead_email },
              matchRationale: candidate.rationale,
              relationshipStrength: candidate.relationship_strength,
              colleagues,
              intentMode: mode,
            })

            await supabase.from('alerts').insert({
              matching_run_id: runId,
              department_id: dept.id,
              recipient_email: candidate.email,
              recipient_name: candidate.name,
              alert_type: 'employee_direct',
              intent_mode: mode,
              response_token: randomUUID(),
              status: 'sent',
            })
          } catch (err) {
            console.error('[Alerts] Employee direct email failed:', err)
          }
        }
      }
    }
  }

  return NextResponse.json({ sent: sentAlerts.length })
}
