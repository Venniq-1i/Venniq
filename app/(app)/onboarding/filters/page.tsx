'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ServiceLine } from '@/types'

const GEO_OPTIONS = ['England', 'Scotland', 'Wales', 'Northern Ireland', 'UK-wide']

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
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

export default function FiltersStep() {
  const [minValue, setMinValue] = useState(500000)
  const [maxValue, setMaxValue] = useState<number | null>(null)
  const [geoScope, setGeoScope] = useState<string[]>(['England'])
  const [specificAreas, setSpecificAreas] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])

  const [serviceLineNames, setServiceLineNames] = useState<string[]>([])
  const [selectedServiceLines, setSelectedServiceLines] = useState<string[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])

  const [competitorNames, setCompetitorNames] = useState<string[]>([])
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const allSelectedCategories = [...selectedServiceLines, ...customCategories]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      const { data: profile } = await supabase
        .from('firm_profiles')
        .select('service_lines, min_contract_value, max_contract_value, geographic_scope, specific_areas, preferred_categories, keywords, exclude_keywords, competitor_names')
        .eq('firm_id', firm.id)
        .single()

      if (profile) {
        if (profile.min_contract_value) setMinValue(profile.min_contract_value)
        if (profile.max_contract_value !== undefined) setMaxValue(profile.max_contract_value)
        if (profile.geographic_scope?.length) setGeoScope(profile.geographic_scope)
        if (profile.specific_areas?.length) setSpecificAreas(profile.specific_areas)
        if (profile.keywords?.length) setKeywords(profile.keywords)
        if (profile.exclude_keywords?.length) setExcludeKeywords(profile.exclude_keywords)
        if (profile.competitor_names?.length) setCompetitorNames(profile.competitor_names)

        const slNames = ((profile.service_lines ?? []) as ServiceLine[]).map(sl => sl.name).filter(Boolean)
        setServiceLineNames(slNames)

        if (profile.preferred_categories?.length) {
          const saved = profile.preferred_categories as string[]
          setSelectedServiceLines(saved.filter(c => slNames.includes(c)))
          setCustomCategories(saved.filter(c => !slNames.includes(c)))
        } else {
          setSelectedServiceLines(slNames)
        }
      }
      setLoadingProfile(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleServiceLine(name: string) {
    setSelectedServiceLines(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  function toggleGeo(geo: string) {
    setGeoScope(prev => prev.includes(geo) ? prev.filter(g => g !== geo) : [...prev, geo])
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
      min_contract_value: minValue,
      max_contract_value: maxValue,
      geographic_scope: geoScope,
      specific_areas: specificAreas,
      preferred_categories: allSelectedCategories,
      keywords,
      exclude_keywords: excludeKeywords,
      competitor_names: competitorNames,
    }, { onConflict: 'firm_id' })

    if (upsertError) { setError(upsertError.message); setSaving(false); return }
    router.push('/onboarding/contract-types')
  }

  const fmt = (v: number) => v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`

  if (loadingProfile) {
    return (
      <OnboardingShell step={4} title="Contract Filters" subtitle="Set the boundaries for the contracts the AI should flag — value, geography, and category.">
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell step={4} title="Contract Filters" subtitle="Set the boundaries for the contracts the AI should flag — value, geography, and category.">
      <div className="space-y-5">

        {/* Contract Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-semibold text-slate-900">Contract Filters</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min contract value: <span className="text-indigo-600">{fmt(minValue)}</span></label>
              <input type="range" min={100000} max={10000000} step={100000} value={minValue}
                onChange={e => setMinValue(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max value: <span className="text-indigo-600">{maxValue ? fmt(maxValue) : 'No cap'}</span></label>
              <input type="range" min={0} max={50000000} step={500000} value={maxValue ?? 0}
                onChange={e => setMaxValue(Number(e.target.value) === 0 ? null : Number(e.target.value))}
                className="w-full accent-indigo-600" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Geographic scope</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {GEO_OPTIONS.map(g => (
                <button key={g} type="button" onClick={() => toggleGeo(g)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${geoScope.includes(g) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {g}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Specific areas <span className="text-slate-400 font-normal">(optional — county, city, or region)</span></label>
              <TagInput value={specificAreas} onChange={setSpecificAreas} placeholder="e.g. Greater Manchester, West Midlands, Edinburgh" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contract categories <span className="text-slate-400 font-normal ml-1">(leave blank for all)</span>
            </label>
            {serviceLineNames.length > 0 && (
              <>
                <p className="text-xs text-indigo-600 mb-2">Pre-selected from your departments — deselect any to exclude.</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {serviceLineNames.map(name => (
                    <button key={name} type="button" onClick={() => toggleServiceLine(name)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedServiceLines.includes(name) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Add a custom category</label>
              <TagInput
                value={customCategories}
                onChange={cats => setCustomCategories(cats)}
                placeholder="Type a category and press Enter"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keywords to include <span className="text-slate-400 font-normal">(press Enter to add)</span></label>
            <TagInput value={keywords} onChange={setKeywords} placeholder="e.g. programme, transformation, consultancy" />
            <p className="text-xs text-slate-400 mt-1">Contracts containing these terms will be prioritised.</p>
          </div>
        </div>

        {/* Avoid These Contracts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900">Avoid These Contracts</h2>
            <p className="text-xs text-slate-500 mt-1">Contracts matching these filters will be excluded from your feed entirely.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Competitor organisations</label>
            <TagInput
              value={competitorNames}
              onChange={setCompetitorNames}
              placeholder="e.g. Mott MacDonald, Jacobs, WSP — press Enter to add"
            />
            <p className="text-xs text-slate-400 mt-1">Contracts issued by or awarded to these organisations will be excluded.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract types or keywords to exclude</label>
            <TagInput
              value={excludeKeywords}
              onChange={setExcludeKeywords}
              placeholder="e.g. catering, cleaning, grounds maintenance — press Enter"
            />
            <p className="text-xs text-slate-400 mt-1">Contracts containing these terms will be filtered out before the AI sees them.</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => router.push('/onboarding/capabilities')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">← Back</button>
          <button type="button" onClick={handleContinue} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
