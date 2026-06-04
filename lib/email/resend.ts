import { Resend } from 'resend'
import { render } from '@react-email/components'
import AlertModeBEmail from '@/emails/AlertModeBEmail'
import AlertModeAEmail from '@/emails/AlertModeAEmail'
import EmployeeDirectEmail from '@/emails/EmployeeDirectEmail'
import FollowUpEmail from '@/emails/FollowUpEmail'
import PursuingLeadershipEmail from '@/emails/PursuingLeadershipEmail'
import type { Contract, MatchedDepartment, Department } from '@/types'
import * as React from 'react'

// Lazy-initialised so the build doesn't fail when env vars are absent at compile time.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Venniq Alerts <alerts@venniq.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://venniq.com'

export function fmt(v: number) {
  return v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`
}

export async function sendModeBAlert(params: {
  contract: Contract
  dept: Department
  matchedDept: MatchedDepartment
  responseToken: string
  coAlertedDepts?: { name: string; leadName: string; leadEmail: string }[]
}): Promise<void> {
  const { contract, dept, matchedDept, responseToken, coAlertedDepts } = params
  const html = await render(
    React.createElement(AlertModeBEmail, {
      contract,
      deptName: dept.name,
      leadName: dept.lead_name,
      matchedDept,
      responseToken,
      coAlertedDepts,
    })
  )
  await getResend().emails.send({
    from: FROM,
    to: dept.lead_email,
    subject: `[Bid Opportunity] ${contract.title} · ${fmt(contract.value)}`,
    html,
  })
}

export async function sendModeAAlert(params: {
  contract: Contract
  dept: Department
  matchedDept: MatchedDepartment
  responseToken: string
  advisoryAnalysis?: string
  coAlertedDepts?: { name: string; leadName: string; leadEmail: string }[]
}): Promise<void> {
  const { contract, dept, matchedDept, responseToken, advisoryAnalysis, coAlertedDepts } = params
  const html = await render(
    React.createElement(AlertModeAEmail, {
      contract,
      deptName: dept.name,
      leadName: dept.lead_name,
      matchedDept,
      responseToken,
      advisoryAnalysis,
      coAlertedDepts,
    })
  )
  await getResend().emails.send({
    from: FROM,
    to: dept.lead_email,
    subject: `[Consultancy & Advisory Sales Opportunity] ${contract.title} · ${fmt(contract.value)}`,
    html,
  })
}

export async function sendEmployeeDirectAlert(params: {
  contract: Contract
  employee: { name: string; email: string }
  deptLead: { name: string; email: string }
  matchRationale: string
  relationshipStrength: string
  colleagues: Array<{ name: string; relationship_strength: string }>
  intentMode: 'A' | 'B'
}): Promise<void> {
  const { contract, employee, deptLead, matchRationale, relationshipStrength, colleagues, intentMode } = params
  const html = await render(
    React.createElement(EmployeeDirectEmail, {
      contract,
      employeeName: employee.name,
      deptLeadName: deptLead.name,
      deptLeadEmail: deptLead.email,
      matchRationale,
      relationshipStrength,
      colleagues,
      intentMode,
    })
  )
  await getResend().emails.send({
    from: FROM,
    to: employee.email,
    subject: `Venniq: you've been flagged for "${contract.title}"`,
    html,
  })
}

export async function sendFollowUpAlert(params: {
  contract: Contract
  dept: Department
  matchedDept: MatchedDepartment
  responseToken: string
  intentMode: 'A' | 'B'
  daysSinceSent: number
}): Promise<void> {
  const { contract, dept, matchedDept, responseToken, intentMode, daysSinceSent } = params
  const html = await render(
    React.createElement(FollowUpEmail, {
      contract,
      deptName: dept.name,
      leadName: dept.lead_name,
      matchedDept,
      responseToken,
      intentMode,
      daysSinceSent,
    })
  )
  await getResend().emails.send({
    from: FROM,
    to: dept.lead_email,
    subject: `[Follow-up] ${contract.title} — your response is still needed`,
    html,
  })
}

export async function sendPursuingLeadershipNotification(params: {
  contract: Contract
  dept: Department
  leadershipEmail: string
  intentMode: 'A' | 'B'
}): Promise<void> {
  const { contract, dept, leadershipEmail, intentMode } = params
  const html = await render(
    React.createElement(PursuingLeadershipEmail, {
      contract,
      deptName: dept.name,
      leadName: dept.lead_name,
      leadEmail: dept.lead_email,
      intentMode,
      dashboardUrl: `${APP_URL}/dashboard`,
    })
  )
  await getResend().emails.send({
    from: FROM,
    to: leadershipEmail,
    subject: `[Actively Pursuing] ${dept.name}: ${contract.title}`,
    html,
  })
}
