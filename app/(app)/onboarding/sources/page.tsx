'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ContractSource } from '@/types'

const DEFAULT_SOURCES: ContractSource[] = [
  { source: 'contracts_finder', label: 'UK Contracts Finder', enabled: true, requiresCredentials: false },
  { source: 'find_a_tender', label: 'Find a Tender Service (FTS)', enabled: true, requiresCredentials: false },
  { source: 'delta_esourcing', label: 'Delta eSourcing', enabled: false, requiresCredentials: true, comingSoon: true },
  { source: 'proactis', label: 'Proactis / Due North', enabled: false, requiresCredentials: true, comingSoon: true },
]

export default function SourcesStep() {
  const [sources, setSources] = useState<ContractSource[]>(DEFAULT_SOURCES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function toggleSource(i: number) {
    if (sources[i].comingSoon) return
    setSources(prev => prev.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s))
  }

  function setCredentials(i: number, creds: string) {
    setSources(prev => prev.map((s, idx) => idx === i ? { ...s, credentials: creds } : s))
  }

  async function handleContinue() {
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    const { error: upsertError } = await supabase.from('firm_profiles').upsert({
      firm_id: firm.id,
      contract_sources: sources.map(s => ({
        source: s.source,
        label: s.label,
        enabled: s.enabled,
        requiresCredentials: s.requiresCredentials,
        ...(s.credentials ? { credentials: s.credentials } : {}),
      })),
    }, { onConflict: 'firm_id' })

    if (upsertError) { setError(upsertError.message); setSaving(false); return }
    router.push('/onboarding/notifications')
  }

  return (
    <OnboardingShell step={8} title="Contract Sources" subtitle="Choose which procurement portals to monitor. Contracts Finder and Find a Tender are both enabled by default — no credentials needed.">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {sources.map((source, i) => (
          <div key={source.source} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${source.enabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center pt-0.5">
              <button
                onClick={() => toggleSource(i)}
                disabled={!!source.comingSoon}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${source.enabled ? 'bg-indigo-600' : 'bg-slate-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ height: '22px' }}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${source.enabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 text-sm">{source.label}</p>
                {source.comingSoon && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Coming soon</span>
                )}
                {(source.source === 'contracts_finder' || source.source === 'find_a_tender') && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Free · No credentials</span>
                )}
              </div>
              {!source.comingSoon && source.requiresCredentials && source.enabled && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={source.credentials ?? ''}
                    onChange={e => setCredentials(i, e.target.value)}
                    placeholder="API key or credentials"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button onClick={() => router.push('/onboarding/employees')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">← Back</button>
          <button onClick={handleContinue} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
