'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ServiceLine } from '@/types'

const PREDEFINED_CAPABILITIES = [
  'Advisory & Consulting',
  'Feasibility Studies',
  'Business Case',
  'Design',
  'Programme Management',
  'Project Management',
  'Construction & Delivery',
  'Contract Management',
  'Operations & Maintenance',
  'Research & Analysis',
  'Data & Technology',
  'Training & Capacity Building',
]

const PREDEFINED_ACCELERATORS = [
  'Climate Response',
  'Net Zero & Sustainability',
  'Data Solutions',
  'AI & Automation',
  'Digital Transformation',
  'Social Value',
  'Community Engagement',
  'Innovation & R&D',
]

function CapabilityPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [custom, setCustom] = useState('')

  function toggle(cap: string) {
    onChange(selected.includes(cap) ? selected.filter(c => c !== cap) : [...selected, cap])
  }

  function addCustom() {
    const t = custom.trim()
    if (t && !selected.includes(t)) onChange([...selected, t])
    setCustom('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {PREDEFINED_CAPABILITIES.map(cap => (
          <button
            key={cap}
            type="button"
            onClick={() => toggle(cap)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(cap)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {cap}
          </button>
        ))}
        {selected.filter(c => !PREDEFINED_CAPABILITIES.includes(c)).map(cap => (
          <span key={cap} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
            {cap}
            <button type="button" onClick={() => toggle(cap)} className="hover:text-violet-900">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Add a custom capability…"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="border border-slate-200 rounded-lg px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-indigo-500 min-h-[42px]">
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs rounded-full px-2 py-0.5 font-medium">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(v => v !== tag))} className="hover:text-indigo-900">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
        className="flex-1 min-w-[120px] outline-none text-sm placeholder-slate-400"
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  )
}

interface CapDraft {
  name: string
  service_line: string
  description: string
  delivery_capabilities: string[]
  typical_clients: string
  contract_keywords: string
}

export default function CapabilitiesStep() {
  const [departments, setDepartments] = useState<CapDraft[]>([])
  const [expanded, setExpanded] = useState<number>(0)
  const [strategicAccelerators, setStrategicAccelerators] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
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
        .select('service_lines, strategic_accelerators')
        .eq('firm_id', firm.id)
        .single()

      if (profile?.service_lines?.length) {
        setDepartments((profile.service_lines as ServiceLine[]).map(sl => ({
          name: sl.name,
          service_line: sl.service_line || '',
          description: sl.description || '',
          delivery_capabilities: sl.delivery_capabilities || [],
          typical_clients: sl.typical_clients || '',
          contract_keywords: sl.contract_keywords || '',
        })))
      }
      if (profile?.strategic_accelerators?.length) {
        setStrategicAccelerators(profile.strategic_accelerators)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateDept(i: number, field: keyof CapDraft, value: string | string[]) {
    setDepartments(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  async function handleContinue() {
    const hasCapabilities = departments.every(d => d.delivery_capabilities.length > 0)
    if (!hasCapabilities) {
      setError('Please select at least one delivery capability per department.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    const toSave: ServiceLine[] = departments.map(d => ({
      name: d.name,
      service_line: d.service_line,
      delivery_capabilities: d.delivery_capabilities,
      description: d.description,
      typical_clients: d.typical_clients,
      contract_keywords: d.contract_keywords,
    }))

    const { error: upsertErr } = await supabase.from('firm_profiles').upsert(
      { firm_id: firm.id, service_lines: toSave, strategic_accelerators: strategicAccelerators },
      { onConflict: 'firm_id' }
    )

    if (upsertErr) { setError(upsertErr.message); setSaving(false); return }
    router.push('/onboarding/filters')
  }

  if (loading) {
    return (
      <OnboardingShell step={3} title="Delivery Capabilities" subtitle="For each department, specify how you deliver work and who typically commissions it.">
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading your departments…</div>
      </OnboardingShell>
    )
  }

  if (departments.length === 0) {
    return (
      <OnboardingShell step={3} title="Delivery Capabilities" subtitle="For each department, specify how you deliver work and who typically commissions it.">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-slate-500 text-sm">
          <p>No departments found. <button type="button" onClick={() => router.push('/onboarding/departments-setup')} className="text-indigo-600 underline">Go back and add your departments first.</button></p>
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      step={3}
      title="Delivery Capabilities"
      subtitle="For each department, specify how you deliver work. These capabilities are used for precise contract routing — only the right department gets alerted."
    >
      <div className="space-y-3">

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800">
          <strong>Two-layer matching:</strong> The service line from Step 2 casts the broad net. The delivery capabilities here determine exactly which department gets routed a specific contract. A "Transport Infrastructure" contract routes to Programme Management, not to every transport team.
        </div>

        {departments.map((dept, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === i ? -1 : i)}
            >
              <div>
                <span className="font-semibold text-slate-900">{dept.name}</span>
                {dept.service_line && <span className="ml-2 text-xs text-slate-400">{dept.service_line}</span>}
                {dept.delivery_capabilities.length > 0 && (
                  <span className="ml-2 text-xs text-indigo-600 font-medium">{dept.delivery_capabilities.length} capabilities</span>
                )}
                {dept.delivery_capabilities.length === 0 && (
                  <span className="ml-2 text-xs text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Capabilities needed</span>
                )}
              </div>
              <span className="text-slate-400 text-lg">{expanded === i ? '−' : '+'}</span>
            </button>

            {expanded === i && (
              <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    How does this department deliver work? <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-400 mb-2">Select all that apply. These are the delivery methods the AI uses to route contracts to this specific team.</p>
                  <CapabilityPicker
                    selected={dept.delivery_capabilities}
                    onChange={v => updateDept(i, 'delivery_capabilities', v)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Who typically commissions this work</label>
                  <textarea
                    value={dept.typical_clients}
                    onChange={e => updateDept(i, 'typical_clients', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="e.g. Local authorities, central government agencies, major contractors seeking advisory support."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract keywords & synonyms</label>
                  <textarea
                    value={dept.contract_keywords}
                    onChange={e => updateDept(i, 'contract_keywords', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Terms contracts use that relate to what this department does — synonyms, abbreviations, related phrases."
                  />
                  <p className="text-xs text-slate-400 mt-1">The more synonyms, the more contracts the AI can surface for this team.</p>
                </div>

              </div>
            )}
          </div>
        ))}

        {/* Strategic Accelerators */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Strategic Accelerators</h2>
            <p className="text-sm text-slate-500 mt-1">Cross-cutting capabilities that apply across multiple departments — themes you can win work on regardless of sector. These help match contracts that might otherwise be missed.</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {PREDEFINED_ACCELERATORS.map(acc => (
              <button
                key={acc}
                type="button"
                onClick={() => setStrategicAccelerators(prev =>
                  prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]
                )}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  strategicAccelerators.includes(acc)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {acc}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Add your own</label>
            <TagInput
              value={strategicAccelerators.filter(a => !PREDEFINED_ACCELERATORS.includes(a))}
              onChange={custom => {
                const predSelected = strategicAccelerators.filter(a => PREDEFINED_ACCELERATORS.includes(a))
                setStrategicAccelerators([...predSelected, ...custom])
              }}
              placeholder="e.g. Carbon Accounting, Asset Management…"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/onboarding/departments-setup')}
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
