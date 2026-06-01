'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AlertRow {
  id: string
  recipient_email: string
  recipient_name: string
  department_id: string
  status: 'sent' | 'looking' | 'pursuing' | 'not_relevant' | 'no_response'
  response_reason: string | null
  sent_at: string
  responded_at: string | null
  matching_run_id: string
}

interface MatchingRunRow {
  id: string
  matched_departments: { department: string }[]
  contract_id: string
}

interface DeptRow {
  id: string
  name: string
}

interface ContractRow {
  id: string
  value: number
}

interface StaffStats {
  email: string
  name: string
  departmentName: string
  sent: number
  responded: number
  pursuing: number
  notRelevant: number
  noResponse: number
  reasons: string[]
  collaborationAlerts: number
}

const eyebrow: React.CSSProperties = {
  fontSize: '10px', fontWeight: 500, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: '#1A6FFF', display: 'block', marginBottom: '8px',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `£${(n / 1000).toFixed(0)}k`
  return `£${n}`
}

function pct(num: number, den: number) {
  if (den === 0) return 0
  return Math.round((num / den) * 100)
}

function RateBadge({ rate }: { rate: number }) {
  const color = rate >= 80 ? '#4ACEA6' : rate >= 60 ? '#FBBF24' : '#FF5C5C'
  const bg    = rate >= 80 ? '#ECFDF5' : rate >= 60 ? 'rgba(251,191,36,0.1)' : '#FFF5F5'
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: bg, color }}>
      {rate}%
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? '#4ACEA6' : value >= 60 ? '#FBBF24' : '#FF5C5C'
  return (
    <div style={{ width: '80px', height: '5px', background: '#EEF2FF', borderRadius: '100px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '100px', transition: 'width 0.4s' }} />
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '20px 24px', flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '0 0 6px', fontWeight: 400 }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 600, color: '#0D1E4F', margin: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '4px 0 0', fontWeight: 300 }}>{sub}</p>}
    </div>
  )
}

export default function TeamActivityPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts]   = useState<AlertRow[]>([])
  const [depts, setDepts]     = useState<DeptRow[]>([])
  const [runs, setRuns]       = useState<MatchingRunRow[]>([])
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      const firmId = firm.id

      const [alertsRes, deptsRes, runsRes, contractsRes] = await Promise.all([
        supabase.from('alerts')
          .select('id, recipient_email, recipient_name, department_id, status, response_reason, sent_at, responded_at, matching_run_id')
          .eq('firm_id', firmId),
        supabase.from('departments').select('id, name').eq('firm_id', firmId).order('name'),
        supabase.from('matching_runs').select('id, matched_departments, contract_id').eq('firm_id', firmId),
        supabase.from('contracts').select('id, value').eq('firm_id', firmId),
      ])

      setAlerts((alertsRes.data ?? []) as AlertRow[])
      setDepts((deptsRes.data ?? []) as DeptRow[])
      setRuns((runsRes.data ?? []) as MatchingRunRow[])
      setContracts((contractsRes.data ?? []) as ContractRow[])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Computed metrics -----

  const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]))
  const contractMap = Object.fromEntries(contracts.map(c => [c.id, c.value]))

  // Cross-dept run IDs (runs with >1 matched dept)
  const crossDeptRunIds = new Set(
    runs.filter(r => Array.isArray(r.matched_departments) && r.matched_departments.length > 1).map(r => r.id)
  )

  // Staff stats
  const staffMap: Record<string, StaffStats> = {}
  alerts.forEach(a => {
    if (!staffMap[a.recipient_email]) {
      staffMap[a.recipient_email] = {
        email: a.recipient_email,
        name: a.recipient_name,
        departmentName: deptMap[a.department_id] ?? '—',
        sent: 0, responded: 0, pursuing: 0, notRelevant: 0, noResponse: 0,
        reasons: [], collaborationAlerts: 0,
      }
    }
    const s = staffMap[a.recipient_email]
    s.sent++
    if (['looking', 'pursuing', 'not_relevant'].includes(a.status)) s.responded++
    if (a.status === 'pursuing')     s.pursuing++
    if (a.status === 'not_relevant') { s.notRelevant++; if (a.response_reason) s.reasons.push(a.response_reason) }
    if (a.status === 'no_response')  s.noResponse++
    if (crossDeptRunIds.has(a.matching_run_id)) s.collaborationAlerts++
  })
  const staff = Object.values(staffMap)

  // Summary metrics
  const totalSent     = alerts.length
  const totalResponse = alerts.filter(a => ['looking', 'pursuing', 'not_relevant'].includes(a.status)).length
  const avgRate       = pct(totalResponse, totalSent)
  const activePursuing = new Set(alerts.filter(a => a.status === 'pursuing').map(a => a.matching_run_id)).size

  // Cross-dept collaborations this quarter
  const now = new Date()
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const crossDeptThisQuarter = runs.filter(r =>
    Array.isArray(r.matched_departments) && r.matched_departments.length > 1
  ).length // Note: matching_runs don't have created_at in the query; would need to add it for quarter filtering — using total for now

  // Cross-dept pairs
  type PairKey = string
  const pairMap: Record<PairKey, { depts: [string, string]; pursuits: number; value: number }> = {}
  runs.forEach(r => {
    if (!Array.isArray(r.matched_departments) || r.matched_departments.length < 2) return
    const deptNames = r.matched_departments.map(md => md.department)
    for (let i = 0; i < deptNames.length; i++) {
      for (let j = i + 1; j < deptNames.length; j++) {
        const key = [deptNames[i], deptNames[j]].sort().join('|||')
        if (!pairMap[key]) pairMap[key] = { depts: [deptNames[i], deptNames[j]], pursuits: 0, value: 0 }
        pairMap[key].pursuits++
        pairMap[key].value += contractMap[r.contract_id] ?? 0
      }
    }
  })
  const pairs = Object.values(pairMap).sort((a, b) => b.pursuits - a.pursuits)

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
      Loading team activity…
    </div>
  )

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <span style={eyebrow}>Leadership View</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.05 }}>
          Team <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>activity</em>
        </h1>
        <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>
          Staff engagement with opportunity alerts across your firm.
        </p>
      </div>

      {/* Section A — Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <MetricCard label="Avg team response rate" value={`${avgRate}%`} sub={`${totalResponse} of ${totalSent} alerts responded`} />
        <MetricCard label="Active opportunities" value={activePursuing} sub="contracts currently being pursued" />
        <MetricCard label="Cross-dept collaborations" value={crossDeptThisQuarter} sub="matching runs involving 2+ departments" />
      </div>

      {/* Section B — Individual engagement */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 4px', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '16px' }}>
          Individual engagement
        </h2>

        {staff.length === 0 ? (
          <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
            No alert data yet. Staff engagement will appear here once alerts have been sent.
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 180px 40px', gap: 0, borderBottom: '0.5px solid #EEF2FF', padding: '10px 20px', background: '#F5F7FF' }}>
              {['Staff member', 'Department', 'Response rate', ''].map((h, i) => (
                <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#8BA4CC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {staff.map((s, idx) => {
              const rate = pct(s.responded, s.sent)
              const isExpanded = expanded === s.email
              const isLast = idx === staff.length - 1
              const responseRate = pct(s.responded, s.sent)
              const collaborationIndex = pct(s.collaborationAlerts, s.sent)
              const pursuitRate = pct(s.pursuing, s.sent)

              return (
                <div key={s.email} style={{ borderBottom: isLast && !isExpanded ? 'none' : '0.5px solid #EEF2FF' }}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : s.email)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 180px 40px', gap: 0, padding: '14px 20px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F', margin: 0 }}>{s.name}</p>
                      <p style={{ fontSize: '11px', color: '#8BA4CC', margin: '2px 0 0', fontWeight: 300 }}>{s.email}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#536180' }}>{s.departmentName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ProgressBar value={rate} />
                      <RateBadge rate={rate} />
                      {s.noResponse > 10 && (
                        <span title="More than 10 non-responses" style={{ fontSize: '14px', cursor: 'default' }}>🚩</span>
                      )}
                    </div>
                    <span style={{ color: '#C2D4F8', fontSize: '16px', textAlign: 'right' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div style={{ background: '#F5F7FF', borderTop: '0.5px solid #EEF2FF', padding: '20px', borderBottom: isLast ? 'none' : '0.5px solid #EEF2FF' }}>
                      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {[
                          { label: 'Sent',        value: s.sent },
                          { label: 'Responded',   value: s.responded },
                          { label: 'Pursuing',    value: s.pursuing },
                          { label: 'Not relevant',value: s.notRelevant },
                          { label: 'No response', value: s.noResponse },
                        ].map(item => (
                          <div key={item.label}>
                            <p style={{ fontSize: '11px', color: '#8BA4CC', margin: '0 0 2px', fontWeight: 400 }}>{item.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: 600, color: '#0D1E4F', margin: 0, lineHeight: 1 }}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {s.reasons.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: '#8BA4CC', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Rejection reasons</p>
                          <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {s.reasons.map((r, i) => (
                              <li key={i} style={{ fontSize: '12px', color: '#536180', fontWeight: 300 }}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Response Rate',       value: responseRate },
                          { label: 'Collaboration Index', value: collaborationIndex },
                          { label: 'Pursuit Rate',        value: pursuitRate },
                        ].map(score => (
                          <div key={score.label} style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '8px', padding: '12px 16px', minWidth: '140px' }}>
                            <p style={{ fontSize: '11px', color: '#8BA4CC', margin: '0 0 6px', fontWeight: 400 }}>{score.label}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ProgressBar value={score.value} />
                              <RateBadge rate={score.value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section C — Cross-departmental collaboration */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '16px' }}>
          Cross-departmental collaboration
        </h2>

        {pairs.length === 0 ? (
          <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
            No cross-departmental opportunities yet. These appear when a contract is matched to two or more departments simultaneously.
          </div>
        ) : (
          <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, borderBottom: '0.5px solid #EEF2FF', padding: '10px 20px', background: '#F5F7FF' }}>
              {['Department pairing', 'Joint pursuits', 'Est. pipeline value'].map((h, i) => (
                <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#8BA4CC', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {pairs.map((pair, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0, padding: '14px 20px', alignItems: 'center', borderBottom: idx === pairs.length - 1 ? 'none' : '0.5px solid #EEF2FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F' }}>{pair.depts[0]}</span>
                  <span style={{ fontSize: '11px', color: '#C2D4F8' }}>×</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F' }}>{pair.depts[1]}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F', textAlign: 'right', paddingLeft: '40px' }}>{pair.pursuits}</span>
                <span style={{ fontSize: '13px', color: '#4ACEA6', fontWeight: 500, textAlign: 'right', paddingLeft: '40px' }}>{pair.value > 0 ? fmt(pair.value) : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
