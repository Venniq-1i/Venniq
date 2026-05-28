'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { MatchingRun, MatchedDepartment, Contract } from '@/types'
import { Suspense } from 'react'

function fmt(v: number) { return v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k` }

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '0.5px solid #D8E4FF',
  borderRadius: '12px',
}

const eyebrow: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#1A6FFF',
  marginBottom: '8px',
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? '#4ACEA6' : pct >= 60 ? '#F5A623' : '#8BA4CC'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, background: '#EEF2FF', borderRadius: '100px', height: '3px', overflow: 'hidden' }}>
        <div style={{ background: color, height: '3px', borderRadius: '100px', width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 500, color: '#0D1E4F', width: '32px', textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function StrengthBadge({ strength }: { strength: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Very Strong': { bg: '#ECFDF5', color: '#4ACEA6' },
    'Strong':      { bg: '#EFF4FF', color: '#1A6FFF' },
    'Moderate':    { bg: '#FFFBEB', color: '#F5A623' },
    'Weak':        { bg: '#F1F5F9', color: '#8BA4CC' },
  }
  const s = map[strength] ?? map['Weak']
  return (
    <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px', background: s.bg, color: s.color }}>
      {strength}
    </span>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    A:  { bg: '#FFFBEB', color: '#F5A623', label: 'Mode A — Sales' },
    B:  { bg: '#EFF4FF', color: '#1A6FFF', label: 'Mode B — Bid' },
    AB: { bg: '#F5F7FF', color: '#536180', label: 'Mode A + B' },
  }
  const s = map[mode] ?? map['B']
  return (
    <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ContractReport({ run }: { run: MatchingRun & { contracts: Contract } }) {
  const contract = run.contracts
  const depts = run.matched_departments
  const [activeTab, setActiveTab] = useState(depts[0]?.department ?? null)
  const activeDept = depts.find(d => d.department === activeTab)
  const days = contract.deadline ? Math.ceil((new Date(contract.deadline).getTime() - Date.now()) / 86400000) : null

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendAlerts() {
    setSending(true)
    await fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: run.id }),
    })
    setSending(false)
    setSent(true)
  }

  return (
    <div style={{ ...card, overflow: 'hidden', marginBottom: '16px' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '0.5px solid #EEF2FF' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', margin: 0 }}>{contract.title}</h3>
              <ModeBadge mode={run.intent_mode} />
            </div>
            <p style={{ fontSize: '13px', color: '#536180', margin: 0, fontWeight: 300 }}>{contract.issuer} · {contract.reference}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#0D1E4F', margin: 0 }}>{fmt(contract.value)}</p>
            {days !== null && (
              <p style={{ fontSize: '12px', color: days <= 14 ? '#FF5C5C' : '#8BA4CC', marginTop: '2px' }}>
                {days > 0 ? `${days} days left` : 'Deadline passed'}
              </p>
            )}
          </div>
        </div>
        {run.ai_response?.firm_relevance_note && (
          <div style={{ marginTop: '12px', background: '#EFF4FF', border: '0.5px solid #C2D4F8', borderRadius: '6px', padding: '10px 14px' }}>
            <p style={{ fontSize: '13px', color: '#536180', margin: 0, fontWeight: 300 }}>{run.ai_response.firm_relevance_note}</p>
          </div>
        )}
      </div>

      {depts.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#8BA4CC', fontSize: '13px' }}>No departments matched for this contract.</div>
      ) : (
        <div>
          {/* Department tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #EEF2FF', overflowX: 'auto' }}>
            {depts.map(dept => (
              <button key={dept.department} onClick={() => setActiveTab(dept.department)} style={{
                padding: '12px 20px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === dept.department ? '#1A6FFF' : '#8BA4CC',
                borderBottom: activeTab === dept.department ? '2px solid #1A6FFF' : '2px solid transparent',
                marginBottom: '-0.5px',
              }}>
                {dept.department}
              </button>
            ))}
          </div>

          {activeDept && (
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#0D1E4F', marginBottom: '4px' }}>
                <strong style={{ fontWeight: 500 }}>Capability match:</strong> {activeDept.capability_match}
              </p>
              <p style={{ fontSize: '13px', color: '#536180', marginBottom: '20px', fontWeight: 300 }}>{activeDept.reason}</p>

              {activeDept.candidates.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#8BA4CC', fontStyle: 'italic' }}>No relationship candidates identified for this department.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeDept.candidates.map((c, i) => (
                    <div key={i} style={{ background: '#F5F7FF', border: '0.5px solid #D8E4FF', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F' }}>{c.name}</span>
                          <StrengthBadge strength={c.relationship_strength} />
                        </div>
                        <div style={{ minWidth: '120px' }}>
                          <ConfidenceBar score={c.confidence_score} />
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '0 0 4px', fontWeight: 300 }}>
                        {c.last_employer} · {c.employed_from}–{c.employed_to} ·{' '}
                        {c.years_since_left === 0 ? 'Currently there' : `Left ${c.years_since_left}yr${c.years_since_left !== 1 ? 's' : ''} ago`}
                      </p>
                      <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '0 0 8px', fontWeight: 300 }}>{c.email}</p>
                      <p style={{ fontSize: '13px', color: '#536180', margin: 0, fontStyle: 'italic', fontWeight: 300 }}>{c.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {depts.length > 0 && (
        <div style={{ padding: '16px 24px', borderTop: '0.5px solid #EEF2FF', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={sendAlerts} disabled={sending || sent} style={{
            padding: '10px 22px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            cursor: sending || sent ? 'default' : 'pointer', opacity: sending ? 0.6 : 1,
            ...(sent
              ? { background: '#ECFDF5', color: '#4ACEA6', border: '0.5px solid #B6EDD9' }
              : { background: '#1A6FFF', color: '#ffffff', border: 'none' }),
          }}>
            {sent ? '✓ Alerts sent' : sending ? 'Sending…' : `Send Alerts (${depts.length} dept${depts.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  )
}

function ReportsContent() {
  const [runs, setRuns] = useState<(MatchingRun & { contracts: Contract })[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const runIdsParam = searchParams.get('runIds')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return

      let query = supabase.from('matching_runs').select('*, contracts(*)').eq('firm_id', firm.id)
      if (runIdsParam) {
        query = query.in('id', runIdsParam.split(','))
      } else {
        query = query.order('created_at', { ascending: false }).limit(20)
      }

      const { data } = await query
      setRuns((data ?? []) as any)
      setLoading(false)
    }
    load()
  }, [])

  const totalContracts  = runs.length
  const totalDepts      = runs.reduce((sum, r) => sum + r.matched_departments.length, 0)
  const totalCandidates = runs.reduce((sum, r) => sum + r.matched_departments.reduce((s: number, d: MatchedDepartment) => s + d.candidates.length, 0), 0)

  if (loading) return <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px', color: '#8BA4CC', fontSize: '14px' }}>Loading reports…</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
        <div>
          <span style={eyebrow}>Opportunity Reports</span>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.05 }}>
            AI-generated <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>intelligence</em>
          </h1>
          <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>Cross-divisional opportunity reports with named outreach candidates.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 20px', background: '#ffffff', color: '#0D2A8C', border: '1.5px solid #0D2A8C', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 400 }}>
          Dashboard →
        </button>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Contracts Analysed',  value: totalContracts },
          { label: 'Departments Alerted', value: totalDepts },
          { label: 'Candidates Found',    value: totalCandidates },
        ].map(m => (
          <div key={m.label} style={{ ...card, padding: '20px', textAlign: 'center' }}>
            <span style={{ ...eyebrow, textAlign: 'center' }}>{m.label}</span>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '36px', fontWeight: 400, color: '#1A6FFF', margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {runs.length === 0 ? (
        <div style={{ ...card, padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#8BA4CC', fontSize: '14px', marginBottom: '16px' }}>No reports yet. Run AI matching on some contracts first.</p>
          <button onClick={() => router.push('/contracts')} style={{ padding: '10px 22px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}>
            Go to Contracts →
          </button>
        </div>
      ) : (
        runs.map(run => <ContractReport key={run.id} run={run} />)
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px', color: '#8BA4CC', fontSize: '14px' }}>Loading…</div>}>
      <ReportsContent />
    </Suspense>
  )
}
