'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DeptRow {
  id: string
  name: string
  lead_name: string
  lead_email: string
}

interface Draft {
  lead_name: string
  lead_email: string
}

const eyebrow: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1A6FFF', marginBottom: '8px',
}
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', border: '0.5px solid #C2D4F8', borderRadius: '6px',
  fontSize: '13px', color: '#0D1E4F', outline: 'none', background: '#ffffff',
  width: '100%', boxSizing: 'border-box',
}

export default function DepartmentsSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading]       = useState(true)
  const [firmId, setFirmId]         = useState<string | null>(null)
  const [departments, setDepts]     = useState<DeptRow[]>([])
  const [drafts, setDrafts]         = useState<Record<string, Draft>>({})
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [savingId, setSavingId]     = useState<string | null>(null)
  const [successId, setSuccessId]   = useState<string | null>(null)
  const [errors, setErrors]         = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      setFirmId(firm.id)
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name, lead_name, lead_email')
        .eq('firm_id', firm.id)
        .order('name')
      if (depts) {
        const rows = depts as DeptRow[]
        setDepts(rows)
        const init: Record<string, Draft> = {}
        rows.forEach(d => { init[d.id] = { lead_name: d.lead_name ?? '', lead_email: d.lead_email ?? '' } })
        setDrafts(init)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(id: string) {
    setEditingId(id)
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  function cancelEdit(id: string) {
    // revert draft to committed value
    const committed = departments.find(d => d.id === id)
    if (committed) {
      setDrafts(prev => ({ ...prev, [id]: { lead_name: committed.lead_name, lead_email: committed.lead_email } }))
    }
    setEditingId(null)
    setErrors(prev => ({ ...prev, [id]: '' }))
  }

  async function saveEdit(id: string) {
    if (!firmId) return
    setSavingId(id)
    setErrors(prev => ({ ...prev, [id]: '' }))
    const draft = drafts[id]
    const { error: err } = await supabase
      .from('departments')
      .update({ lead_name: draft.lead_name, lead_email: draft.lead_email })
      .eq('id', id)
      .eq('firm_id', firmId)
    if (err) {
      setErrors(prev => ({ ...prev, [id]: err.message }))
      setSavingId(null)
      return
    }
    // commit to displayed data
    setDepts(prev => prev.map(d => d.id === id ? { ...d, lead_name: draft.lead_name, lead_email: draft.lead_email } : d))
    setSavingId(null)
    setEditingId(null)
    setSuccessId(id)
    setTimeout(() => setSuccessId(s => s === id ? null : s), 2000)
  }

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
      Loading department data…
    </div>
  )

  return (
    <div style={{ maxWidth: '720px', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={eyebrow}>Settings</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.1 }}>
          Department <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>notifications</em>
        </h1>
        <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>
          Set the designated contract lead for each department. Alerts for matched contracts are sent to this person.
        </p>
      </div>

      {departments.length === 0 ? (
        <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
          No departments found. Add departments during onboarding or contact support.
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0', borderBottom: '0.5px solid #EEF2FF', padding: '10px 20px', background: '#F5F7FF' }}>
            {['Department', 'Contract Lead', 'Email', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: '#8BA4CC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {departments.map((dept, idx) => {
            const isEditing = editingId === dept.id
            const isSaving  = savingId === dept.id
            const isSuccess = successId === dept.id
            const rowError  = errors[dept.id] || ''
            const draft     = drafts[dept.id] ?? { lead_name: '', lead_email: '' }
            const isLast    = idx === departments.length - 1

            return (
              <div
                key={dept.id}
                style={{
                  borderBottom: isLast ? 'none' : '0.5px solid #EEF2FF',
                  background: isEditing ? '#FAFBFF' : '#ffffff',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0', padding: '14px 20px', alignItems: 'center' }}>
                  {/* Department name */}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F' }}>{dept.name}</span>

                  {/* Lead name */}
                  {isEditing ? (
                    <div style={{ paddingRight: '12px' }}>
                      <input
                        type="text"
                        value={draft.lead_name}
                        onChange={e => setDrafts(prev => ({ ...prev, [dept.id]: { ...prev[dept.id], lead_name: e.target.value } }))}
                        style={inputStyle}
                        placeholder="Full name"
                        disabled={isSaving}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: draft.lead_name ? '#0D1E4F' : '#C2D4F8', fontWeight: 300 }}>
                      {draft.lead_name || '—'}
                    </span>
                  )}

                  {/* Lead email */}
                  {isEditing ? (
                    <div style={{ paddingRight: '12px' }}>
                      <input
                        type="email"
                        value={draft.lead_email}
                        onChange={e => setDrafts(prev => ({ ...prev, [dept.id]: { ...prev[dept.id], lead_email: e.target.value } }))}
                        style={inputStyle}
                        placeholder="email@firm.com"
                        disabled={isSaving}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: draft.lead_email ? '#536180' : '#C2D4F8', fontWeight: 300 }}>
                      {draft.lead_email || '—'}
                    </span>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    {isSuccess && !isEditing && (
                      <span style={{ fontSize: '12px', color: '#4ACEA6', fontWeight: 500 }}>✓ Saved</span>
                    )}
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(dept.id)}
                          disabled={isSaving}
                          style={{ padding: '5px 12px', background: '#1A6FFF', color: '#ffffff', border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(dept.id)}
                          disabled={isSaving}
                          style={{ padding: '5px 10px', background: 'none', color: '#8BA4CC', border: '0.5px solid #D8E4FF', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(dept.id)}
                        style={{ padding: '5px 12px', background: '#F5F7FF', color: '#0D1E4F', border: '0.5px solid #D8E4FF', borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline error */}
                {rowError && (
                  <div style={{ padding: '0 20px 10px', fontSize: '12px', color: '#FF5C5C' }}>{rowError}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
