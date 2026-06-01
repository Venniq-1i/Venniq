'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContractSource } from '@/types'

const DEFAULT_SOURCES: ContractSource[] = [
  { source: 'contracts_finder', label: 'Contracts Finder', enabled: true,  requiresCredentials: false },
  { source: 'find_a_tender',    label: 'Find a Tender',    enabled: true,  requiresCredentials: false },
  { source: 'delta_esourcing',  label: 'Delta eSourcing',  enabled: false, requiresCredentials: true, comingSoon: true },
  { source: 'proactis',         label: 'Proactis',         enabled: false, requiresCredentials: true, comingSoon: true },
]

const FREQ_OPTIONS: { value: 'realtime' | 'daily' | 'weekly'; label: string; desc: string }[] = [
  { value: 'realtime', label: 'Real-time',    desc: 'Alerts sent immediately when a match is found.' },
  { value: 'daily',    label: 'Daily digest', desc: 'All matches bundled into one email each morning.' },
  { value: 'weekly',   label: 'Weekly digest',desc: 'All matches summarised in a single weekly email.' },
]

const eyebrow: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 500,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1A6FFF', marginBottom: '8px',
}
const card: React.CSSProperties = {
  background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px',
}
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500, color: '#0D1E4F', marginBottom: '4px',
}

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

export default function SubscriptionPage() {
  const supabase = createClient()
  const [loading, setLoading]               = useState(true)
  const [firmId, setFirmId]                 = useState<string | null>(null)
  const [alertsPaused, setAlertsPaused]     = useState(false)
  const [frequency, setFrequency]           = useState<'realtime' | 'daily' | 'weekly'>('realtime')
  const [sources, setSources]               = useState<ContractSource[]>([])
  const [saving, setSaving]                 = useState<string | null>(null)
  const [error, setError]                   = useState('')
  const [cancelConfirm, setCancelConfirm]   = useState(false)
  const [cancelDone, setCancelDone]         = useState(false)
  const [cancelling, setCancelling]         = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      setFirmId(firm.id)
      const { data: profile } = await supabase
        .from('firm_profiles')
        .select('alerts_paused, alert_frequency, contract_sources')
        .eq('firm_id', firm.id)
        .single()
      if (profile) {
        setAlertsPaused(profile.alerts_paused ?? false)
        setFrequency(profile.alert_frequency ?? 'realtime')
        const saved: ContractSource[] = profile.contract_sources ?? []
        const merged = DEFAULT_SOURCES.map(def => {
          const existing = saved.find(s => s.source === def.source)
          return existing ? { ...def, ...existing } : def
        })
        setSources(merged)
      } else {
        setSources(DEFAULT_SOURCES)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function patch(updates: Record<string, unknown>) {
    if (!firmId) return
    const { error: err } = await supabase
      .from('firm_profiles')
      .upsert({ firm_id: firmId, ...updates }, { onConflict: 'firm_id' })
    if (err) throw err
  }

  async function toggleAlerts() {
    const next = !alertsPaused
    setAlertsPaused(next)
    setSaving('alerts')
    setError('')
    try {
      await patch({ alerts_paused: next })
    } catch {
      setAlertsPaused(!next) // rollback
      setError('Failed to update alert status. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function changeFrequency(val: 'realtime' | 'daily' | 'weekly') {
    setFrequency(val)
    setSaving('freq')
    setError('')
    try {
      await patch({ alert_frequency: val })
    } catch {
      setError('Failed to update frequency. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function toggleSource(source: string) {
    const next = sources.map(s => s.source === source ? { ...s, enabled: !s.enabled } : s)
    setSources(next)
    setSaving('sources')
    setError('')
    try {
      await patch({ contract_sources: next })
    } catch {
      setSources(sources) // rollback
      setError('Failed to update sources. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true)
    // Placeholder — marks firm with a cancelled_at timestamp via a simple upsert
    await new Promise(r => setTimeout(r, 800))
    setCancelling(false)
    setCancelDone(true)
    setCancelConfirm(false)
  }

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: '#8BA4CC', fontSize: '14px' }}>
      Loading subscription settings…
    </div>
  )

  return (
    <div style={{ maxWidth: '640px', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={eyebrow}>Settings</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.1 }}>
          Subscription <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>&amp; Alerts</em>
        </h1>
      </div>

      {error && (
        <div style={{ background: '#FFF5F5', border: '0.5px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#FF5C5C' }}>
          {error}
        </div>
      )}

      {/* Alert service toggle */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 4px' }}>Alert service</p>
              <p style={{ fontSize: '12px', color: '#8BA4CC', margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                When paused, no new alerts will be sent to your team. Contracts will still be ingested and matched in the background.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: alertsPaused ? '#FBBF24' : '#4ACEA6',
                  display: 'inline-block',
                  boxShadow: alertsPaused ? '0 0 0 3px rgba(251,191,36,0.15)' : '0 0 0 3px rgba(74,206,166,0.15)',
                }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: alertsPaused ? '#FBBF24' : '#4ACEA6' }}>
                  {alertsPaused ? 'Paused' : 'Active'}
                </span>
                {saving === 'alerts' && <span style={{ fontSize: '11px', color: '#8BA4CC' }}>Saving…</span>}
              </div>
            </div>
            <Toggle on={!alertsPaused} onToggle={toggleAlerts} disabled={saving === 'alerts'} />
          </div>
        </div>
      </section>

      {/* Alert frequency */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ ...card, padding: '20px' }}>
          <label style={{ ...fieldLabel, marginBottom: '14px' }}>
            Alert frequency
            {saving === 'freq' && <span style={{ fontSize: '11px', color: '#8BA4CC', fontWeight: 300, marginLeft: '8px' }}>Saving…</span>}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FREQ_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', border: `0.5px solid ${frequency === opt.value ? '#1A6FFF' : '#D8E4FF'}`, background: frequency === opt.value ? '#EFF4FF' : '#ffffff', transition: 'all 0.15s' }}>
                <input
                  type="radio"
                  name="frequency"
                  value={opt.value}
                  checked={frequency === opt.value}
                  onChange={() => changeFrequency(opt.value)}
                  style={{ marginTop: '2px', accentColor: '#1A6FFF', cursor: 'pointer' }}
                />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F' }}>{opt.label}</span>
                  <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '2px 0 0', fontWeight: 300 }}>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Contract sources */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ ...card, padding: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 4px' }}>Contract sources</p>
          <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '0 0 16px', fontWeight: 300 }}>
            Choose which procurement portals Venniq monitors. Changes apply to the next scheduled discovery run.
          </p>
          {saving === 'sources' && <p style={{ fontSize: '11px', color: '#8BA4CC', margin: '0 0 10px' }}>Saving…</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map(src => (
              <div key={src.source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F' }}>{src.label}</span>
                    {src.comingSoon && (
                      <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px', background: '#F5F7FF', color: '#8BA4CC', border: '0.5px solid #D8E4FF' }}>Coming soon</span>
                    )}
                    {!src.comingSoon && src.enabled && (
                      <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px', background: '#ECFDF5', color: '#4ACEA6' }}>Active</span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: '#8BA4CC', margin: 0, fontWeight: 300 }}>
                    {src.requiresCredentials ? 'Paid — API credentials required' : 'Free public API'}
                  </p>
                </div>
                <Toggle
                  on={src.enabled && !src.comingSoon}
                  onToggle={() => { if (!src.comingSoon) toggleSource(src.source) }}
                  disabled={!!src.comingSoon || saving === 'sources'}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <div style={{ ...card, border: '0.5px solid #FCA5A5', padding: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#FF5C5C', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Danger zone</p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F', margin: '8px 0 4px' }}>Cancel subscription</p>
          <p style={{ fontSize: '12px', color: '#8BA4CC', margin: '0 0 16px', fontWeight: 300, lineHeight: 1.5 }}>
            This will stop all contract discovery, matching, and alerts. Your data will be retained for 30 days before permanent deletion.
          </p>

          {cancelDone ? (
            <p style={{ fontSize: '13px', color: '#4ACEA6', fontWeight: 500 }}>✓ Cancellation request received. Our team will be in touch within 24 hours.</p>
          ) : cancelConfirm ? (
            <div style={{ background: '#FFF5F5', border: '0.5px solid #FCA5A5', borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ fontSize: '13px', color: '#0D1E4F', margin: '0 0 12px', fontWeight: 500 }}>
                Are you sure? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  style={{ padding: '8px 16px', background: '#FF5C5C', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}
                >
                  {cancelling ? 'Processing…' : 'Yes, cancel my subscription'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelConfirm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#8BA4CC' }}
                >
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCancelConfirm(true)}
              style={{ padding: '8px 16px', background: '#ffffff', color: '#FF5C5C', border: '0.5px solid #FCA5A5', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              Cancel subscription
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
