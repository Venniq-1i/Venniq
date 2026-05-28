import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPursuingLeadershipNotification } from '@/lib/email/resend'
import type { Contract, Department, MatchedDepartment } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://venniq.com'
const LEADERSHIP_EMAIL = process.env.LEADERSHIP_NOTIFY_EMAIL ?? ''
const FOLLOW_UP_DAYS = parseInt(process.env.ALERT_FOLLOW_UP_DAYS ?? '3', 10)

// Predefined "Not Relevant" reasons — structured for dashboard analytics
const NOT_RELEVANT_REASONS = [
  'Outside our sector focus',
  'Contract value too small',
  'Already have a relationship / conflict of interest',
  'Insufficient capacity at this time',
  'Not enough time to respond before deadline',
  'Relationship too old / no longer active',
  'Other',
]

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function htmlPage(title: string, body: string) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Venniq — ${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px 16px;
      color: #0f172a;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .logo { font-size: 18px; font-weight: 800; margin-bottom: 24px; }
    .logo span { color: #4f46e5; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
    select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      background: #f8fafc;
      margin-bottom: 12px;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      cursor: pointer;
    }
    select:focus { outline: 2px solid #4f46e5; border-color: transparent; }
    button {
      width: 100%;
      padding: 11px 20px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
    }
    button:hover { background: #4338ca; }
    .badge {
      display: inline-block;
      padding: 5px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 15px;
      margin: 12px 0 16px;
    }
    .badge-pursuing { background: #d1fae5; color: #065f46; }
    .badge-looking { background: #dbeafe; color: #1e40af; }
    .badge-not-relevant { background: #f1f5f9; color: #475569; }
    .note { font-size: 12px; color: #94a3b8; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">CREN<span>DORA</span></div>
    ${body}
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const searchParams = req.nextUrl.searchParams
  const status = searchParams.get('status')
  const reason = searchParams.get('reason')

  const validStatuses = ['looking', 'pursuing', 'not_relevant']
  if (!status || !validStatuses.includes(status)) {
    return htmlPage('Invalid link', `<h1>Invalid response link</h1><p>This link appears to be invalid or has expired.</p>`)
  }

  // "Not Relevant" requires a reason from the structured dropdown
  if (status === 'not_relevant' && !reason) {
    const options = NOT_RELEVANT_REASONS.map(r =>
      `<option value="${r.replace(/"/g, '&quot;')}">${r}</option>`
    ).join('')

    return htmlPage(
      'Why isn\'t this relevant?',
      `<h1>Why isn't this relevant?</h1>
      <p>Please select the closest reason. This is visible to leadership and helps improve future matching.</p>
      <form method="GET">
        <input type="hidden" name="status" value="not_relevant" />
        <select name="reason" required>
          <option value="" disabled selected>Select a reason…</option>
          ${options}
        </select>
        <button type="submit">Submit response</button>
      </form>
      <p class="note">No login required. One click is all it takes.</p>`
    )
  }

  const supabase = getServiceClient()

  // Load alert with its matching run and contract for email context
  const { data: alert } = await supabase
    .from('alerts')
    .select('id, status, intent_mode, matching_run_id, department_id')
    .eq('response_token', token)
    .single()

  if (!alert) {
    return htmlPage('Link not found', `<h1>Response link not found</h1><p>This link has expired or was already used.</p>`)
  }

  // Compute follow-up due date (only relevant when status = 'looking')
  const followUpDueAt =
    status === 'looking'
      ? (() => { const d = new Date(); d.setDate(d.getDate() + FOLLOW_UP_DAYS); return d.toISOString() })()
      : null

  await supabase.from('alerts').update({
    status,
    response_reason: reason ?? null,
    responded_at: new Date().toISOString(),
    follow_up_due_at: followUpDueAt,
  }).eq('response_token', token)

  // "Actively Pursuing" — send leadership notification
  if (status === 'pursuing' && LEADERSHIP_EMAIL) {
    try {
      const { data: runData } = await supabase
        .from('matching_runs')
        .select('*, contracts(*)')
        .eq('id', alert.matching_run_id)
        .single()

      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('id', alert.department_id)
        .single()

      if (runData && deptData) {
        await sendPursuingLeadershipNotification({
          contract: runData.contracts as Contract,
          dept: deptData as Department,
          leadershipEmail: LEADERSHIP_EMAIL,
          intentMode: alert.intent_mode as 'A' | 'B',
        })
      }
    } catch (err) {
      console.error('[Response] Leadership notification failed:', err)
    }
  }

  const labels: Record<string, string> = {
    looking: 'Looking Into It',
    pursuing: 'Actively Pursuing',
    not_relevant: 'Not Relevant',
  }
  const badgeClass: Record<string, string> = {
    looking: 'badge-looking',
    pursuing: 'badge-pursuing',
    not_relevant: 'badge-not-relevant',
  }

  const followUpNote =
    status === 'looking'
      ? `<p>You'll receive one follow-up in ${FOLLOW_UP_DAYS} days if no further action is taken.</p>`
      : status === 'pursuing'
      ? `<p>Your leadership team has been notified. No further follow-up emails will be sent for this opportunity.</p>`
      : `<p>This has been logged. No further emails will be sent for this opportunity.</p>`

  return htmlPage(
    'Response recorded',
    `<h1>Response recorded</h1>
    <div class="badge ${badgeClass[status] ?? ''}">${labels[status] ?? status}</div>
    ${reason ? `<p style="background:#f8fafc;padding:12px;border-radius:8px;font-style:italic;color:#475569">"${reason}"</p>` : ''}
    ${followUpNote}
    <p>Thank you. Your response has been logged on the Venniq leadership dashboard.</p>
    <p class="note"><a href="${APP_URL}/dashboard" style="color:#4f46e5">View dashboard →</a></p>`
  )
}
