'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DepartmentLead } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_MARKETS = [
  'Transport', 'Central Government', 'Local Government', 'Healthcare',
  'Energy & Utilities', 'Defence', 'Housing & Real Estate', 'Financial Services',
  'Education', 'Environment', 'Justice & Emergency Services',
  'Digital / Technology', 'Construction', 'Infrastructure',
]

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadDraft {
  name: string
  email: string
  markets_sectors: string[]
  is_primary: boolean
}

interface DeptState {
  id: string
  name: string
  leads: LeadDraft[]
  direct_notify_employees: boolean
  // snapshot for cancel
  _saved: { leads: LeadDraft[]; direct_notify_employees: boolean }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyLead(isPrimary = false): LeadDraft {
  return { name: '', email: '', markets_sectors: [], is_primary: isPrimary }
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      style={{
        flexShrink: 0, width: '36px', height: '20px', borderRadius: '100px',
        background: on ? '#1A6FFF' : '#D8E4FF',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: on ? '18px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '0.5px solid #C2D4F8', borderRadius: '6px',
  fontSize: '13px', color: '#0D1E4F', outline: 'none', background: '#ffffff',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500, color: '#536180', marginBottom: '4px',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepartmentsSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading]     = useState(true)
  const [firmId, setFirmId]       = useState<string | null>(null)
  const [depts, setDepts]         = useState<DeptState[]>([])
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [savingId, setSavingId]   = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [errors, setErrors]       = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      setFirmId(firm.id)

      const { data } = await supabase
        .from('departments')
        .select('id, name, lead_name, lead_email, leads, direct_notify_employees')
        .eq('firm_id', firm.id)
        .order('name')

      if (data) {
        const rows: DeptState[] = data.map(d => {
          // Restore leads from JSONB, falling back to legacy fields
          let leads: LeadDraft[]
          if (d.leads?.length) {
            leads = (d.leads as DepartmentLead[]).map(l => ({
              name: l.name ?? '',
              email: l.email ?? '',
              markets_sectors: l.markets_sectors ?? [],
              is_primary: l.is_primary ?? false,
            }))
            if (!leads.some(l => l.is_primary)) leads[0].is_primary = true
          } else if (d.lead_name) {
            leads = [{ name: d.lead_name, email: d.lead_email ?? '', markets_sectors: [], is_primary: true }]
          } else {
            leads = [emptyLead(true)]
          }
          const base = { leads, direct_notify_employees: d.direct_notify_employees ?? false }
          return { id: d.id, name: d.name, ...base, _saved: deepClone(base) }
        })
        setDepts(rows)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dept-level mutators ───────────────────────────────────────────────────

  function updateLead(deptId: string, li: number, field: keyof LeadDraft, value: string | string[] | boolean) {
    setDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d
      const leads = d.leads.map((l, i) => i === li ? { ...l, [field]: value } : l)
      return { ...d, leads }
    }))
  }

  function addLead(deptId: string) {
    setDepts(prev => prev.map(d =>
      d.id !== deptId ? d : { ...d, leads: [...d.leads, emptyLead(false)] }
    ))
  }

  function removeLead(deptId: string, li: number) {
    setDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d
      const leads = d.leads.filter((_, i) => i !== li)
      if (leads.length === 0) return { ...d, leads: [emptyLead(true)] }
      if (!leads.some(l => l.is_primary)) leads[0].is_primary = true
      return { ...d, leads }
    }))
  }

  function setPrimary(deptId: string, li: number) {
    setDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d
      return { ...d, leads: d.leads.map((l, i) => ({ ...l, is_primary: i === li })) }
    }))
  }

  function toggleDirectNotify(deptId: string) {
    setDepts(prev => prev.map(d =>
      d.id !== deptId ? d : { ...d, direct_notify_employees: !d.direct_notify_employees }
    ))
  }

  function cancelEdit(deptId: string) {
    setDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d
      return { ...d, leads: deepClone(d._saved.leads), direct_notify_employees: d._saved.direct_notify_employees }
    }))
    setExpanded(null)
    setErrors(prev => ({ ...prev, [deptId]: '' }))
  }

  async function saveDept(deptId: string) {
    if (!firmId) return
    const dept = depts.find(d => d.id === deptId)
    if (!dept) return

    setSavingId(deptId)
    setErrors(prev => ({ ...prev, [deptId]: '' }))

    const primary = dept.leads.find(l => l.is_primary) ?? dept.leads[0]
    const { error: err } = await supabase
      .from('departments')
      .update({
        leads: dept.leads,
        lead_name: primary?.name ?? '',
        lead_email: primary?.email ?? '',
        direct_notify_employees: dept.direct_notify_employees,
      })
      .eq('id', deptId)
      .eq('firm_id', firmId)

    if (err) {
      setErrors(prev => ({ ...prev, [deptId]: err.message }))
      setSavingId(null)
      return
    }

    // Commit snapshot
    setDepts(prev => prev.map(d =>
      d.id !== deptId ? d : {
        ...d,
        _saved: deepClone({ leads: d.leads, direct_notify_employees: d.direct_notify_employees }),
      }
    ))
    setSavingId(null)
    setExpanded(null)
    setSuccessId(deptId)
    setTimeout(() => setSuccessId(s => s === deptId ? null : s), 2500)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
      Loading department data…
    </div>
  )

  return (
    <div style={{ maxWidth: '720px', paddingBottom: '60px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1A6FFF', marginBottom: '8px' }}>Settings</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.1 }}>
          Department <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>leads &amp; alerts</em>
        </h1>
        <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300, lineHeight: 1.6 }}>
          Manage contract leads per department. Each lead can be scoped to specific Markets &amp; Sectors — they&apos;ll only be alerted on opportunities that match their remit.
        </p>
      </div>

      {/* How alerts work explainer */}
      <div style={{ background: '#F5F7FF', border: '0.5px solid #D8E4FF', borderRadius: '10px', padding: '14px 18px', marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#0D1E4F', margin: '0 0 8px', letterSpacing: '0.03em' }}>How alerts work</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { icon: '✓', label: 'Contract leads always notified', desc: 'Every contract lead receives an alert email when a matching opportunity is found for their department.' },
            { icon: '⚙', label: 'Scope by Markets & Sectors', desc: 'Assign specific sectors to a lead to limit their alerts. Leave blank and they receive alerts for all sectors.' },
            { icon: '○', label: 'Also notify matched employees (optional)', desc: 'Turn on "Direct employee alerts" per department to also send a copy to the individual employees flagged by the AI. The lead remains the decision-maker — employee emails have no response buttons.' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: '#8BA4CC', marginTop: '1px', flexShrink: 0, width: '14px' }}>{item.icon}</span>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#0D1E4F' }}>{item.label}</span>
                <span style={{ fontSize: '12px', color: '#8BA4CC', fontWeight: 300 }}> — {item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department cards */}
      {depts.length === 0 ? (
        <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
          No departments found. Add departments during onboarding or contact support.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {depts.map(dept => {
            const isOpen    = expandedId === dept.id
            const isSaving  = savingId === dept.id
            const isSuccess = successId === dept.id && !isOpen
            const rowError  = errors[dept.id] || ''
            const primaryLead = dept.leads.find(l => l.is_primary)

            return (
              <div key={dept.id} style={{ background: '#ffffff', border: `0.5px solid ${isOpen ? '#C2D4F8' : '#D8E4FF'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.15s' }}>

                {/* Collapsed header — always visible */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : dept.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F' }}>{dept.name}</span>
                    {!isOpen && (
                      <span style={{ fontSize: '12px', color: '#8BA4CC', fontWeight: 300, flexShrink: 0 }}>
                        {dept.leads.length} lead{dept.leads.length !== 1 ? 's' : ''}
                        {primaryLead?.name ? ` · ${primaryLead.name}` : ''}
                        {dept.direct_notify_employees ? ' · employees notified' : ''}
                      </span>
                    )}
                    {isSuccess && (
                      <span style={{ fontSize: '12px', color: '#4ACEA6', fontWeight: 500, flexShrink: 0 }}>✓ Saved</span>
                    )}
                  </div>
                  <span style={{ color: '#C2D4F8', fontSize: '14px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div style={{ borderTop: '0.5px solid #EEF2FF', padding: '20px' }}>

                    {/* Leads list */}
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#8BA4CC', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Contract leads</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {dept.leads.map((lead, li) => (
                          <div key={li} style={{ background: '#F5F7FF', border: '0.5px solid #EEF2FF', borderRadius: '10px', padding: '14px 16px' }}>
                            {/* Lead header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {lead.is_primary ? (
                                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: '#EFF4FF', color: '#1A6FFF', border: '0.5px solid #C2D4F8' }}>Primary lead</span>
                                ) : (
                                  <>
                                    <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px', background: '#F5F7FF', color: '#8BA4CC', border: '0.5px solid #D8E4FF' }}>Additional lead</span>
                                    <button type="button" onClick={() => setPrimary(dept.id, li)} style={{ fontSize: '11px', color: '#1A6FFF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                      Make primary
                                    </button>
                                  </>
                                )}
                              </div>
                              {!lead.is_primary && (
                                <button type="button" onClick={() => removeLead(dept.id, li)} style={{ fontSize: '11px', color: '#FF5C5C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  Remove
                                </button>
                              )}
                            </div>

                            {/* Name + Email */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                              <div>
                                <label style={fieldLabel}>Name {lead.is_primary && <span style={{ color: '#FF5C5C' }}>*</span>}</label>
                                <input
                                  type="text"
                                  value={lead.name}
                                  onChange={e => updateLead(dept.id, li, 'name', e.target.value)}
                                  style={inputStyle}
                                  placeholder="e.g. Sarah Johnson"
                                  disabled={isSaving}
                                />
                              </div>
                              <div>
                                <label style={fieldLabel}>Email {lead.is_primary && <span style={{ color: '#FF5C5C' }}>*</span>}</label>
                                <input
                                  type="email"
                                  value={lead.email}
                                  onChange={e => updateLead(dept.id, li, 'email', e.target.value)}
                                  style={inputStyle}
                                  placeholder="sarah@firm.com"
                                  disabled={isSaving}
                                />
                              </div>
                            </div>

                            {/* Markets & Sectors */}
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: 500, color: '#536180', margin: '0 0 6px' }}>
                                Markets &amp; Sectors <span style={{ color: '#8BA4CC', fontWeight: 300 }}>(leave blank = alerted on all)</span>
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {ALL_MARKETS.map(market => {
                                  const active = lead.markets_sectors.includes(market)
                                  return (
                                    <button
                                      key={market}
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => updateLead(dept.id, li, 'markets_sectors',
                                        active ? lead.markets_sectors.filter(m => m !== market) : [...lead.markets_sectors, market]
                                      )}
                                      style={{
                                        padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 500,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        border: active ? 'none' : '0.5px solid #D8E4FF',
                                        background: active ? '#1A6FFF' : '#ffffff',
                                        color: active ? '#ffffff' : '#536180',
                                        transition: 'all 0.12s',
                                      }}
                                    >
                                      {market}
                                    </button>
                                  )
                                })}
                              </div>
                              {lead.markets_sectors.length > 0 && (
                                <p style={{ fontSize: '11px', color: '#8BA4CC', margin: '6px 0 0', fontWeight: 300 }}>
                                  This lead will only be alerted on contracts matching: <strong style={{ color: '#536180', fontWeight: 500 }}>{lead.markets_sectors.join(', ')}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addLead(dept.id)}
                        disabled={isSaving}
                        style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#ffffff', border: '0.5px dashed #C2D4F8', borderRadius: '8px', fontSize: '12px', color: '#8BA4CC', cursor: 'pointer' }}
                      >
                        + Add another lead
                      </button>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '0.5px solid #EEF2FF', margin: '20px 0' }} />

                    {/* Direct employee notification toggle — clearly labelled */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 4px' }}>
                          Also notify matched employees directly
                        </p>
                        <p style={{ fontSize: '12px', color: '#8BA4CC', margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                          When on, a separate personalised email goes to each employee the AI flagged for this opportunity — informing them they&apos;ve been identified and naming their contract lead. <strong style={{ color: '#536180', fontWeight: 500 }}>The contract lead remains the sole decision-maker</strong>; employee emails contain no response buttons.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                            background: dept.direct_notify_employees ? '#4ACEA6' : '#D8E4FF',
                            display: 'inline-block',
                          }} />
                          <span style={{ fontSize: '11px', fontWeight: 500, color: dept.direct_notify_employees ? '#4ACEA6' : '#8BA4CC' }}>
                            {dept.direct_notify_employees ? 'Employees will be notified directly' : 'Only the contract lead is notified'}
                          </span>
                        </div>
                      </div>
                      <Toggle
                        on={dept.direct_notify_employees}
                        onToggle={() => toggleDirectNotify(dept.id)}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Error */}
                    {rowError && (
                      <p style={{ fontSize: '12px', color: '#FF5C5C', background: '#FFF5F5', border: '0.5px solid #FCA5A5', borderRadius: '6px', padding: '8px 12px', margin: '0 0 12px' }}>{rowError}</p>
                    )}

                    {/* Save / Cancel */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => cancelEdit(dept.id)}
                        disabled={isSaving}
                        style={{ padding: '8px 16px', background: 'none', color: '#8BA4CC', border: '0.5px solid #D8E4FF', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveDept(dept.id)}
                        disabled={isSaving}
                        style={{ padding: '8px 20px', background: '#1A6FFF', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}
                      >
                        {isSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
