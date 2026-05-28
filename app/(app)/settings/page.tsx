'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FirmProfile, Department, ServiceLine } from '@/types'

const ALL_MARKETS = [
  'Transport', 'Central Government', 'Local Government', 'Healthcare',
  'Energy & Utilities', 'Defence', 'Housing & Real Estate', 'Financial Services',
  'Education', 'Environment', 'Justice & Emergency Services',
  'Digital / Technology', 'Construction', 'Infrastructure',
]

let _counter = 0
const newLineId = () => ++_counter

interface ServiceLineDraft extends ServiceLine { _id: number }
interface DeptDraft {
  id: string; name: string; what_we_do: string
  specific_services: string; contract_types_won: string; keywords_synonyms: string
}

const eyebrow: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1A6FFF', marginBottom: '8px',
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500, color: '#0D1E4F', marginBottom: '6px',
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '6px',
  fontSize: '14px', color: '#0D1E4F', outline: 'none', boxSizing: 'border-box',
  fontWeight: 300, resize: 'none' as const,
}

const card: React.CSSProperties = {
  background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', overflow: 'hidden',
}

export default function SettingsPage() {
  const supabase = createClient()
  const [companyOverview, setCompanyOverview]     = useState('')
  const [coreMarkets, setCoreMarkets]             = useState<string[]>([])
  const [customMarket, setCustomMarket]           = useState('')
  const [geographicalFocus, setGeographicalFocus] = useState('')
  const [serviceLines, setServiceLines]           = useState<ServiceLineDraft[]>([])
  const [expandedLine, setExpandedLine]           = useState<number>(-1)
  const [competitorNames, setCompetitorNames]     = useState<string[]>([])
  const [excludeKeywords, setExcludeKeywords]     = useState<string[]>([])
  const [competitorDraft, setCompetitorDraft]     = useState('')
  const [excludeDraft, setExcludeDraft]           = useState('')
  const [departments, setDepartments]             = useState<DeptDraft[]>([])
  const [expandedDept, setExpandedDept]           = useState<string>('')
  const [loading, setLoading]                     = useState(true)
  const [saving, setSaving]                       = useState(false)
  const [saved, setSaved]                         = useState(false)
  const [error, setError]                         = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      const [{ data: profileData }, { data: deptData }] = await Promise.all([
        supabase.from('firm_profiles').select('*').eq('firm_id', firm.id).single(),
        supabase.from('departments').select('*').eq('firm_id', firm.id).order('name'),
      ])
      if (profileData) {
        const p = profileData as FirmProfile
        setCompanyOverview(p.company_overview || p.services_description || '')
        setCoreMarkets(p.core_markets ?? [])
        setGeographicalFocus(p.geographical_focus || '')
        setCompetitorNames(p.competitor_names ?? [])
        setExcludeKeywords(p.exclude_keywords ?? [])
        const lines: ServiceLineDraft[] = (p.service_lines ?? []).map(sl => ({ ...sl, _id: newLineId() }))
        setServiceLines(lines.length > 0 ? lines : [{ _id: newLineId(), name: '', service_line: '', delivery_capabilities: [], description: '', typical_clients: '', contract_keywords: '' }])
        if (lines.length > 0) setExpandedLine(lines[0]._id)
      }
      if (deptData) {
        const depts = (deptData as Department[]).map(d => ({ id: d.id, name: d.name, what_we_do: d.what_we_do || d.capabilities || '', specific_services: d.specific_services || '', contract_types_won: d.contract_types_won || '', keywords_synonyms: d.keywords_synonyms || '' }))
        setDepartments(depts)
        if (depts.length > 0) setExpandedDept(depts[0].id)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleMarket(m: string) {
    setCoreMarkets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }
  function addCustomMarket() {
    const m = customMarket.trim()
    if (m && !coreMarkets.includes(m)) setCoreMarkets(prev => [...prev, m])
    setCustomMarket('')
  }
  function updateLine(id: number, field: keyof ServiceLine, value: string) {
    setServiceLines(prev => prev.map(l => l._id === id ? { ...l, [field]: value } : l))
  }
  function addLine() {
    const next: ServiceLineDraft = { _id: newLineId(), name: '', service_line: '', delivery_capabilities: [], description: '', typical_clients: '', contract_keywords: '' }
    setServiceLines(prev => [...prev, next])
    setExpandedLine(next._id)
  }
  function removeLine(id: number) {
    setServiceLines(prev => {
      const next = prev.filter(l => l._id !== id)
      return next.length > 0 ? next : [{ _id: newLineId(), name: '', service_line: '', delivery_capabilities: [], description: '', typical_clients: '', contract_keywords: '' }]
    })
  }
  function updateDept(id: string, field: keyof DeptDraft, value: string) {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setSaving(false); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }
    const linesToSave: ServiceLine[] = serviceLines.map(({ _id: _, ...sl }) => sl)
    const { error: profileErr } = await supabase.from('firm_profiles').upsert({ firm_id: firm.id, company_overview: companyOverview, core_markets: coreMarkets, geographical_focus: geographicalFocus, service_lines: linesToSave, competitor_names: competitorNames, exclude_keywords: excludeKeywords, services_description: companyOverview }, { onConflict: 'firm_id' })
    if (profileErr) { setError(profileErr.message); setSaving(false); return }
    for (const dept of departments) {
      const { error: deptErr } = await supabase.from('departments').update({ what_we_do: dept.what_we_do, specific_services: dept.specific_services, contract_types_won: dept.contract_types_won, keywords_synonyms: dept.keywords_synonyms, capabilities: dept.what_we_do }).eq('id', dept.id).eq('firm_id', firm.id)
      if (deptErr) { setError(deptErr.message); setSaving(false); return }
    }
    const rebuildRes = await fetch('/api/settings/rebuild-profile', { method: 'POST' })
    if (!rebuildRes.ok) { const body = await rebuildRes.json(); setError(body.error ?? 'Failed to rebuild profile.'); setSaving(false); return }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  if (loading) return <div style={{ maxWidth: '768px', margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>Loading your company intelligence profile…</div>

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '40px 16px 120px' }}>
      <div style={{ marginBottom: '40px' }}>
        <span style={eyebrow}>Settings</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.05 }}>
          Company <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>intelligence</em>
        </h1>
        <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>
          The context Claude reads before every contract matching run. Keep it accurate — match quality depends on it.
        </p>
      </div>

      {/* Company Profile */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 4px', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '20px' }}>Company Profile</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={fieldLabel}>Company Overview</label>
            <textarea value={companyOverview} onChange={e => setCompanyOverview(e.target.value)} rows={4} style={inputBase} placeholder="A 2–3 sentence description of what the firm is, its size, the sectors it operates in, and the types of clients it typically works with." />
          </div>

          <div>
            <label style={fieldLabel}>Core Markets & Sectors</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {ALL_MARKETS.map(m => {
                const active = coreMarkets.includes(m)
                return (
                  <button key={m} type="button" onClick={() => toggleMarket(m)} style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: active ? 'none' : '0.5px solid #D8E4FF', background: active ? '#1A6FFF' : '#ffffff', color: active ? '#ffffff' : '#536180', transition: 'all 0.15s' }}>
                    {m}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={customMarket} onChange={e => setCustomMarket(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomMarket() } }} style={{ ...inputBase, flex: 1, resize: undefined }} placeholder="Add a custom market…" />
              <button type="button" onClick={addCustomMarket} disabled={!customMarket.trim()} style={{ padding: '10px 14px', background: '#F5F7FF', color: '#0D1E4F', border: '0.5px solid #D8E4FF', borderRadius: '6px', fontSize: '12px', cursor: customMarket.trim() ? 'pointer' : 'not-allowed', opacity: customMarket.trim() ? 1 : 0.4 }}>Add</button>
            </div>
            {coreMarkets.filter(m => !ALL_MARKETS.includes(m)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {coreMarkets.filter(m => !ALL_MARKETS.includes(m)).map(m => (
                  <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, background: '#EFF4FF', color: '#1A6FFF', border: '0.5px solid #C2D4F8' }}>
                    {m}
                    <button type="button" onClick={() => toggleMarket(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A6FFF', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={fieldLabel}>Geographical Focus</label>
            <textarea value={geographicalFocus} onChange={e => setGeographicalFocus(e.target.value)} rows={2} style={inputBase} placeholder="Where the firm operates and actively pursues work." />
          </div>
        </div>
      </section>

      {/* Avoid These Contracts */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '8px' }}>Avoid These Contracts</h2>
        <p style={{ fontSize: '13px', color: '#536180', marginBottom: '20px', fontWeight: 300 }}>Contracts matching these filters will be excluded from your feed entirely.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={fieldLabel}>Competitor organisations</label>
            <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '44px' }}>
              {competitorNames.map(name => (
                <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, background: '#FFF5F5', color: '#FF5C5C', border: '0.5px solid #FCA5A5', borderRadius: '100px', padding: '2px 9px' }}>
                  {name}
                  <button type="button" onClick={() => setCompetitorNames(prev => prev.filter(n => n !== name))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF5C5C', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
              <input value={competitorDraft} onChange={e => setCompetitorDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = competitorDraft.trim(); if (v && !competitorNames.includes(v)) setCompetitorNames(prev => [...prev, v]); setCompetitorDraft('') } }}
                onBlur={() => { const v = competitorDraft.trim(); if (v && !competitorNames.includes(v)) setCompetitorNames(prev => [...prev, v]); setCompetitorDraft('') }}
                style={{ flex: 1, minWidth: '120px', background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: '#0D1E4F', fontWeight: 300 }}
                placeholder={competitorNames.length === 0 ? 'e.g. Mott MacDonald, Jacobs — press Enter' : ''} />
            </div>
            <p style={{ fontSize: '12px', color: '#8BA4CC', marginTop: '4px', fontWeight: 300 }}>Contracts issued by or awarded to these organisations will be excluded.</p>
          </div>

          <div>
            <label style={fieldLabel}>Keywords to exclude</label>
            <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '44px' }}>
              {excludeKeywords.map(kw => (
                <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, background: '#F1F5F9', color: '#536180', borderRadius: '100px', padding: '2px 9px' }}>
                  {kw}
                  <button type="button" onClick={() => setExcludeKeywords(prev => prev.filter(k => k !== kw))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#536180', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
              <input value={excludeDraft} onChange={e => setExcludeDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = excludeDraft.trim(); if (v && !excludeKeywords.includes(v)) setExcludeKeywords(prev => [...prev, v]); setExcludeDraft('') } }}
                onBlur={() => { const v = excludeDraft.trim(); if (v && !excludeKeywords.includes(v)) setExcludeKeywords(prev => [...prev, v]); setExcludeDraft('') }}
                style={{ flex: 1, minWidth: '120px', background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: '#0D1E4F', fontWeight: 300 }}
                placeholder={excludeKeywords.length === 0 ? 'e.g. catering, cleaning — press Enter' : ''} />
            </div>
            <p style={{ fontSize: '12px', color: '#8BA4CC', marginTop: '4px', fontWeight: 300 }}>Contracts containing these terms will be filtered out before the AI sees them.</p>
          </div>
        </div>
      </section>

      {/* Service Lines */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '8px' }}>Firm Service Lines</h2>
        <p style={{ fontSize: '13px', color: '#536180', marginBottom: '16px', fontWeight: 300 }}>One entry per major service. Claude reads these to understand what contracts your firm can deliver on.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {serviceLines.map((line, i) => (
            <div key={line._id} style={card}>
              <button type="button" onClick={() => setExpandedLine(expandedLine === line._id ? -1 : line._id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F' }}>{line.name || `Service Line ${i + 1}`}</span>
                <span style={{ color: '#8BA4CC', fontSize: '18px', fontWeight: 300 }}>{expandedLine === line._id ? '−' : '+'}</span>
              </button>
              {expandedLine === line._id && (
                <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid #EEF2FF', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {([
                    { f: 'name' as keyof ServiceLine,             lab: 'Service name',                  ph: 'e.g. Programme Management',       rows: 1 },
                    { f: 'description' as keyof ServiceLine,      lab: 'What this service is',           ph: 'Describe it as you would to a client. What problems does it solve?', rows: 3 },
                    { f: 'typical_clients' as keyof ServiceLine,  lab: 'Who typically needs it',         ph: 'What types of organisations or projects commission this?', rows: 2 },
                    { f: 'contract_keywords' as keyof ServiceLine,lab: 'Contract keywords & synonyms',   ph: 'Language contracts use. Include abbreviations and related terms.', rows: 2 },
                  ] as const).map(({ f, lab, ph, rows }) => (
                    <div key={f}>
                      <label style={fieldLabel}>{lab}</label>
                      {rows === 1
                        ? <input type="text" value={line[f] as string} onChange={e => updateLine(line._id, f, e.target.value)} style={{ ...inputBase, resize: undefined }} placeholder={ph} />
                        : <textarea value={line[f] as string} onChange={e => updateLine(line._id, f, e.target.value)} rows={rows} style={inputBase} placeholder={ph} />
                      }
                    </div>
                  ))}
                  {serviceLines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line._id)} style={{ fontSize: '12px', color: '#FF5C5C', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Remove this service line</button>
                  )}
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={addLine} style={{ width: '100%', padding: '14px', background: '#ffffff', border: '0.5px dashed #C2D4F8', borderRadius: '12px', fontSize: '13px', color: '#8BA4CC', cursor: 'pointer' }}>
            + Add service line
          </button>
        </div>
      </section>

      {/* Department Service Profiles */}
      {departments.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0D1E4F', borderBottom: '0.5px solid #EEF2FF', paddingBottom: '12px', marginBottom: '8px' }}>Department Service Profiles</h2>
          <p style={{ fontSize: '13px', color: '#536180', marginBottom: '16px', fontWeight: 300 }}>Describe what each department delivers. Claude uses this to route contracts to the right team.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {departments.map(dept => (
              <div key={dept.id} style={card}>
                <button type="button" onClick={() => setExpandedDept(expandedDept === dept.id ? '' : dept.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F' }}>{dept.name}</span>
                  <span style={{ color: '#8BA4CC', fontSize: '18px', fontWeight: 300 }}>{expandedDept === dept.id ? '−' : '+'}</span>
                </button>
                {expandedDept === dept.id && (
                  <div style={{ padding: '0 20px 20px', borderTop: '0.5px solid #EEF2FF', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {([
                      { f: 'what_we_do' as keyof DeptDraft,         lab: 'What this department does',                        ph: 'Describe what the department delivers, written how a BD professional would pitch it.', rows: 4 },
                      { f: 'specific_services' as keyof DeptDraft,  lab: 'Specific services offered',                        ph: 'One service per line.', rows: 4 },
                      { f: 'contract_types_won' as keyof DeptDraft, lab: 'Types of contracts this department typically wins', ph: 'Framework call-offs, standalone commissions, client-side PM roles, etc.', rows: 3 },
                      { f: 'keywords_synonyms' as keyof DeptDraft,  lab: 'Keywords & synonyms Claude should recognise',      ph: 'Terms that mean the same as your services, because contracts use different language.', rows: 3 },
                    ] as const).map(({ f, lab, ph, rows }) => (
                      <div key={f}>
                        <label style={fieldLabel}>{lab}</label>
                        <textarea value={dept[f]} onChange={e => updateDept(dept.id, f, e.target.value)} rows={rows} style={inputBase} placeholder={ph} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky save bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '0.5px solid #D8E4FF', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', zIndex: 20 }}>
        <div style={{ fontSize: '13px' }}>
          {saved && <span style={{ color: '#4ACEA6', fontWeight: 500 }}>✓ Profile saved and rebuilt</span>}
          {error && <span style={{ color: '#FF5C5C' }}>{error}</span>}
        </div>
        <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {saving ? 'Saving & rebuilding…' : 'Save & Rebuild Profile'}
        </button>
      </div>
    </div>
  )
}
