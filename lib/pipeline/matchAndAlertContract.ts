import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contract, Department, Employee, FirmProfile, MatchedDepartment } from '@/types'
import { classifyIntent } from '@/lib/relevanceProfile'
import { matchContractToEmployees } from '@/lib/claude/matching'
import { sendModeAAlert, sendModeBAlert, sendEmployeeDirectAlert } from '@/lib/email/resend'

const FOLLOW_UP_DAYS = parseInt(process.env.ALERT_FOLLOW_UP_DAYS ?? '3', 10)
const NO_RESPONSE_DAYS = parseInt(process.env.ALERT_NO_RESPONSE_DAYS ?? '7', 10)

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

/**
 * Runs the full match-and-alert pipeline for a single contract.
 * Safe to call with a service-role Supabase client (no user session required).
 *
 * - Classifies intent (Mode A / B / AB)
 * - Calls Claude to match contract against employees
 * - Saves a matching_run record
 * - Sends alerts to department heads (and optionally direct employee alerts)
 */
export async function matchAndAlertContract(
  supabase: SupabaseClient,
  firmId: string,
  contractId: string,
  profile: FirmProfile,
  employees: Employee[],
  departments: Department[]
): Promise<'matched' | 'no_match' | 'error'> {
  const { data: contractRow } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('firm_id', firmId)
    .single()

  if (!contractRow) {
    console.error(`[Match:${firmId}] Contract ${contractId} not found`)
    return 'error'
  }

  const contract = contractRow as Contract

  const intentMode = classifyIntent(contract, profile)
  if (!intentMode) {
    await supabase.from('contracts').update({ status: 'no_match' }).eq('id', contractId)
    console.log(`[Match:${firmId}] Contract ${contractId} — no_match (below thresholds)`)
    return 'no_match'
  }

  await supabase.from('contracts').update({ status: 'processing' }).eq('id', contractId)

  try {
    const result = await matchContractToEmployees(
      contract,
      employees,
      profile,
      profile.profile_markdown,
      intentMode
    )

    const { data: run } = await supabase
      .from('matching_runs')
      .insert({
        firm_id: firmId,
        contract_id: contractId,
        intent_mode: intentMode,
        ai_response: result,
        matched_departments: result.matched_departments ?? [],
      })
      .select('id')
      .single()

    await supabase.from('contracts').update({ status: 'matched' }).eq('id', contractId)

    if (run) {
      await sendAlerts(supabase, run.id, contract, result.matched_departments ?? [], departments, employees, intentMode)
    }

    return 'matched'
  } catch (err) {
    console.error(`[Match:${firmId}] Contract ${contractId} error:`, err)
    await supabase.from('contracts').update({ status: 'new' }).eq('id', contractId)
    return 'error'
  }
}

async function sendAlerts(
  supabase: SupabaseClient,
  runId: string,
  contract: Contract,
  matchedDepartments: MatchedDepartment[],
  departments: Department[],
  employees: Employee[],
  intentMode: 'A' | 'B' | 'AB'
) {
  const modes = intentMode === 'AB' ? (['A', 'B'] as const) : ([intentMode] as const)

  for (const mode of modes) {
    for (const matchedDept of matchedDepartments) {
      const dept = departments.find(d => d.name === matchedDept.department)
      if (!dept) continue

      const responseToken = randomUUID()

      await supabase.from('alerts').insert({
        matching_run_id: runId,
        department_id: dept.id,
        recipient_email: dept.lead_email,
        recipient_name: dept.lead_name,
        alert_type: 'dept_head',
        intent_mode: mode,
        response_token: responseToken,
        status: 'sent',
        no_response_due_at: daysFromNow(NO_RESPONSE_DAYS),
        follow_up_due_at: daysFromNow(FOLLOW_UP_DAYS),
      })

      try {
        if (mode === 'B') {
          await sendModeBAlert({ contract, dept, matchedDept, responseToken })
        } else {
          await sendModeAAlert({ contract, dept, matchedDept, responseToken })
        }
      } catch (err) {
        console.error(`[Alerts] Email to ${dept.lead_email} failed:`, err)
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
            console.error(`[Alerts] Employee direct to ${candidate.email} failed:`, err)
          }
        }
      }
    }
  }
}
