'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ModeATriggers, ModeBTriggers, ServiceLine } from '@/types'

export default function ContractTypesStep() {
  const [deptNames, setDeptNames] = useState<string[]>([])

  // Mode A
  const [modeAEnabled, setModeAEnabled] = useState(true)
  const [modeAMin, setModeAMin] = useState(1000000)
  const [modeATypes, setModeATypes] = useState<string[]>([])
  const [modeAAwardedOnly, setModeAAwardedOnly] = useState(false)

  // Mode B
  const [modeBEnabled, setModeBEnabled] = useState(true)
  const [modeBMin, setModeBMin] = useState(500000)
  const [modeBTypes, setModeBTypes] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('firm_profiles')
        .select('service_lines, mode_a_triggers, mode_b_triggers')
        .eq('firm_id', firm.id)
        .single()

      if (profile) {
        const names = ((profile.service_lines ?? []) as ServiceLine[]).map(sl => sl.name).filter(Boolean)
        setDeptNames(names)

        if (profile.mode_a_triggers) {
          setModeAEnabled(profile.mode_a_triggers.enabled ?? true)
          setModeAMin(profile.mode_a_triggers.minValue ?? 1000000)
          setModeATypes(profile.mode_a_triggers.contractTypes ?? [])
          setModeAAwardedOnly(profile.mode_a_triggers.awardedOnly ?? false)
        }
        if (profile.mode_b_triggers) {
          setModeBEnabled(profile.mode_b_triggers.enabled ?? true)
          setModeBMin(profile.mode_b_triggers.minValue ?? 500000)
          setModeBTypes(profile.mode_b_triggers.contractTypes ?? [])
        }
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleModeAType(name: string) {
    setModeATypes(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  function toggleModeBType(name: string) {
    setModeBTypes(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  async function handleContinue() {
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    const modeATriggers: ModeATriggers = {
      enabled: modeAEnabled, minValue: modeAMin, contractTypes: modeATypes, awardedOnly: modeAAwardedOnly,
      competitorExclusions: [], includeWinnerAnalysis: true,
    }
    const modeBTriggers: ModeBTriggers = {
      enabled: modeBEnabled, minValue: modeBMin, contractTypes: modeBTypes,
    }

    const { error: upsertError } = await supabase.from('firm_profiles').upsert(
      { firm_id: firm.id, mode_a_triggers: modeATriggers, mode_b_triggers: modeBTriggers },
      { onConflict: 'firm_id' }
    )

    if (upsertError) { setError(upsertError.message); setSaving(false); return }
    router.push('/onboarding/leads')
  }

  const fmt = (v: number) => v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`

  if (loading) {
    return (
      <OnboardingShell step={5} title="Contract Types" subtitle="Tell us which types of opportunities your firm wants to be alerted about.">
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      step={5}
      title="Contract Types"
      subtitle="Choose which types of opportunities your firm wants to be alerted about — consultancy outreach, direct bidding, or both."
    >
      <div className="space-y-5">

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600">
          A single contract can trigger both modes — a Mode B alert to the delivery department and a Mode A alert to the advisory department.
        </div>

        {/* Mode A */}
        <div className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition-colors ${modeAEnabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Mode A — Consultancy & Advisory Outreach</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Triggered when a contract is <strong>awarded to a competitor</strong> — alerting your team to reach out for post-award consultancy, or when an expression of interest is published and bidders will need your advisory support.
                Your alert: <em>reach out now — this company may need your services.</em>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModeAEnabled(v => !v)}
              className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modeAEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              aria-label="Toggle Mode A"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${modeAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {modeAEnabled && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minimum value: <span className="text-indigo-600">{fmt(modeAMin)}</span></label>
                  <input type="range" min={100000} max={20000000} step={100000} value={modeAMin}
                    onChange={e => setModeAMin(Number(e.target.value))} className="w-full accent-indigo-600" />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={modeAAwardedOnly} onChange={e => setModeAAwardedOnly(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm text-slate-700">Awarded contracts only <span className="text-slate-400">(skip expression-of-interest stage)</span></span>
                  </label>
                </div>
              </div>

              {deptNames.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Which departments trigger Mode A? <span className="text-slate-400 font-normal">(blank = all)</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Select the departments where you want to be alerted when someone else wins a contract needing your services.</p>
                  <div className="flex flex-wrap gap-2">
                    {deptNames.map(name => (
                      <button key={name} type="button" onClick={() => toggleModeAType(name)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${modeATypes.includes(name) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mode B */}
        <div className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition-colors ${modeBEnabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Mode B — Direct Delivery Bidding</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Triggered when a <strong>live procurement opportunity</strong> is published that your firm can bid on and deliver directly — not as a subcontractor, not as an advisor, but as the prime contractor.
                Your alert: <em>here is an opportunity — identify the best bid team.</em>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModeBEnabled(v => !v)}
              className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${modeBEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
              aria-label="Toggle Mode B"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${modeBEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {modeBEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum value: <span className="text-indigo-600">{fmt(modeBMin)}</span></label>
                <input type="range" min={100000} max={20000000} step={100000} value={modeBMin}
                  onChange={e => setModeBMin(Number(e.target.value))} className="w-full accent-indigo-600" />
              </div>

              {deptNames.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Which departments trigger Mode B? <span className="text-slate-400 font-normal">(blank = all)</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Select the departments that should be alerted about direct bid opportunities — contracts your firm should submit a proposal for.</p>
                  <div className="flex flex-wrap gap-2">
                    {deptNames.map(name => (
                      <button key={name} type="button" onClick={() => toggleModeBType(name)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${modeBTypes.includes(name) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => router.push('/onboarding/filters')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">← Back</button>
          <button type="button" onClick={handleContinue} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
