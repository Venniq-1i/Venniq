'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ServiceLine } from '@/types'

const ALL_SERVICE_LINES = [
  'Transport', 'Water & Utilities', 'Energy', 'Healthcare', 'Central Government',
  'Local Government', 'Housing & Real Estate', 'Education', 'Environment',
  'Justice & Emergency Services', 'Defence', 'Digital / Technology',
  'Construction', 'Infrastructure', 'Financial Services',
]

interface DeptDraft {
  _id: number
  name: string
  service_line: string
  description: string
  typical_clients: string
  contract_keywords: string
  delivery_capabilities: string[]
}

let _counter = 0
const emptyDept = (): DeptDraft => ({
  _id: ++_counter,
  name: '',
  service_line: '',
  description: '',
  typical_clients: '',
  contract_keywords: '',
  delivery_capabilities: [],
})

export default function DepartmentsSetupStep() {
  const [departments, setDepartments] = useState<DeptDraft[]>([emptyDept()])
  const [expanded, setExpanded] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [manualEntryNotice, setManualEntryNotice] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const needsManual = sessionStorage.getItem('venniq_manual_entry_needed') === 'true'
      if (needsManual) {
        setManualEntryNotice(true)
        sessionStorage.removeItem('venniq_manual_entry_needed')
        return
      }

      // Step 1 saves scraped service lines directly to firm_profiles, so always load from DB.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      const { data: profile } = await supabase
        .from('firm_profiles')
        .select('service_lines')
        .eq('firm_id', firm.id)
        .single()
      if (profile?.service_lines?.length) {
        const saved = (profile.service_lines as ServiceLine[])
        setDepartments(saved.map(sl => ({
          _id: ++_counter,
          name: sl.name,
          service_line: sl.service_line || '',
          description: sl.description || '',
          typical_clients: sl.typical_clients || '',
          contract_keywords: sl.contract_keywords || '',
          delivery_capabilities: sl.delivery_capabilities || [],
        })))
        setExpanded(0)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(id: number, field: keyof DeptDraft, value: string) {
    setDepartments(prev => prev.map(d => d._id === id ? { ...d, [field]: value } : d))
  }

  function addDept() {
    const next = emptyDept()
    setDepartments(prev => [...prev, next])
    setExpanded(next._id)
  }

  function removeDept(id: number) {
    setDepartments(prev => {
      const next = prev.filter(d => d._id !== id)
      return next.length > 0 ? next : [emptyDept()]
    })
  }

  async function handleContinue() {
    const valid = departments.every(d => d.name.trim())
    if (!valid) { setError('Each department needs a name.'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    // Save as service_lines — keep any existing capability/keyword data by merging
    const { data: existing } = await supabase
      .from('firm_profiles')
      .select('service_lines')
      .eq('firm_id', firm.id)
      .single()

    const existingLines = ((existing?.service_lines ?? []) as ServiceLine[])
    const existingByName = new Map(existingLines.map(sl => [sl.name.toLowerCase().trim(), sl]))

    const toSave: ServiceLine[] = departments.map(d => {
      const prev = existingByName.get(d.name.toLowerCase().trim())
      return {
        name: d.name,
        service_line: d.service_line,
        delivery_capabilities: d.delivery_capabilities.length > 0 ? d.delivery_capabilities : (prev?.delivery_capabilities ?? []),
        description: d.description,
        typical_clients: d.typical_clients || prev?.typical_clients || '',
        contract_keywords: d.contract_keywords || prev?.contract_keywords || '',
      }
    })

    const { error: upsertErr } = await supabase.from('firm_profiles').upsert(
      { firm_id: firm.id, service_lines: toSave },
      { onConflict: 'firm_id' }
    )

    if (upsertErr) { setError(upsertErr.message); setSaving(false); return }
    router.push('/onboarding/capabilities')
  }

  return (
    <OnboardingShell
      step={2}
      title="Your Departments"
      subtitle="List each department or team that actively pursues and delivers work. Each one becomes a matching unit — the AI will route relevant contracts to the right team."
    >
      <div className="space-y-3">

        {manualEntryNotice && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            We weren't able to identify your departments from your website. Please add them manually below.
          </div>
        )}

        {!manualEntryNotice && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800">
            <strong>Why this matters:</strong> Each department you add here becomes an independent contract-matching unit. Alerts will be routed directly to the right team — not broadcast to everyone. The AI also uses the service line to make the initial broad match before routing.
          </div>
        )}

        {departments.map((dept, i) => (
          <div key={dept._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === dept._id ? -1 : dept._id)}
            >
              <span className="font-semibold text-slate-900">
                {dept.name || `Department ${i + 1}`}
                {dept.service_line && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{dept.service_line}</span>
                )}
              </span>
              <span className="text-slate-400 text-lg">{expanded === dept._id ? '−' : '+'}</span>
            </button>

            {expanded === dept._id && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dept.name}
                    onChange={e => update(dept._id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Infrastructure Advisory"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Service line / market sector
                  </label>
                  <p className="text-xs text-slate-400 mb-2">The top-level market this department operates in. Used for broad contract filtering before routing.</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ALL_SERVICE_LINES.map(sl => (
                      <button
                        key={sl}
                        type="button"
                        onClick={() => update(dept._id, 'service_line', dept.service_line === sl ? '' : sl)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          dept.service_line === sl
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {sl}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={!ALL_SERVICE_LINES.includes(dept.service_line) ? dept.service_line : ''}
                    onChange={e => update(dept._id, 'service_line', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Or type a custom service line…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">What this department does</label>
                  <textarea
                    value={dept.description}
                    onChange={e => update(dept._id, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="A brief description of what this team delivers and who commissions it."
                  />
                </div>

                {departments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDept(dept._id)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove department
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addDept}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          + Add department
        </button>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/onboarding/firm')}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
