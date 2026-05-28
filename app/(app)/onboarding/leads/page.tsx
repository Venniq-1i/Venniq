'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ServiceLine, Department, DepartmentLead } from '@/types'

interface LeadEntry {
  name: string
  email: string
  capabilities: string[]
  is_primary: boolean
}

interface DeptLeads {
  id?: string
  deptName: string
  availableCapabilities: string[]
  leads: LeadEntry[]
}

function emptyLead(isPrimary = false): LeadEntry {
  return { name: '', email: '', capabilities: [], is_primary: isPrimary }
}

function CapabilityToggle({
  available,
  selected,
  onChange,
}: {
  available: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  if (available.length === 0) return null
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1.5">Handles these capabilities <span className="text-slate-400">(leave blank = handles all)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {available.map(cap => (
          <button
            key={cap}
            type="button"
            onClick={() => onChange(selected.includes(cap) ? selected.filter(c => c !== cap) : [...selected, cap])}
            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(cap)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {cap}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LeadsStep() {
  const [deptLeads, setDeptLeads] = useState<DeptLeads[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warningShown, setWarningShown] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) { setLoading(false); return }

      const [{ data: profileData }, { data: existingDepts }] = await Promise.all([
        supabase.from('firm_profiles').select('service_lines').eq('firm_id', firm.id).single(),
        supabase.from('departments').select('id, name, lead_name, lead_email, leads').eq('firm_id', firm.id),
      ])

      const serviceLines = ((profileData?.service_lines ?? []) as ServiceLine[])
      const saved = ((existingDepts ?? []) as Pick<Department, 'id' | 'name' | 'lead_name' | 'lead_email' | 'leads'>[])
      const savedByName = new Map(saved.map(d => [d.name.toLowerCase().trim(), d]))

      const items: DeptLeads[] = serviceLines.map(sl => {
        const match = savedByName.get(sl.name.toLowerCase().trim())
        const caps = sl.delivery_capabilities ?? []

        // Restore saved leads array if present, else build from legacy lead_name/lead_email
        let leads: LeadEntry[]
        if (match?.leads?.length) {
          leads = match.leads.map((l: DepartmentLead) => ({
            name: l.name,
            email: l.email,
            capabilities: l.capabilities ?? [],
            is_primary: l.is_primary ?? false,
          }))
          // Ensure at least one primary marker
          if (!leads.some(l => l.is_primary)) leads[0].is_primary = true
        } else if (match?.lead_name) {
          leads = [{ name: match.lead_name, email: match.lead_email, capabilities: [], is_primary: true }]
        } else {
          leads = [emptyLead(true)]
        }

        return { id: match?.id, deptName: sl.name, availableCapabilities: caps, leads }
      })

      if (items.length === 0 && saved.length > 0) {
        // Fallback: no service lines yet — use saved departments
        setDeptLeads(saved.map(d => ({
          id: d.id,
          deptName: d.name,
          availableCapabilities: [],
          leads: d.leads?.length
            ? d.leads.map((l: DepartmentLead) => ({ ...l, capabilities: l.capabilities ?? [] }))
            : [{ name: d.lead_name, email: d.lead_email, capabilities: [], is_primary: true }],
        })))
      } else {
        setDeptLeads(items)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateLead(deptIdx: number, leadIdx: number, field: keyof LeadEntry, value: string | string[] | boolean) {
    setDeptLeads(prev => prev.map((d, di) => {
      if (di !== deptIdx) return d
      return { ...d, leads: d.leads.map((l, li) => li === leadIdx ? { ...l, [field]: value } : l) }
    }))
  }

  function addLead(deptIdx: number) {
    setDeptLeads(prev => prev.map((d, di) =>
      di === deptIdx ? { ...d, leads: [...d.leads, emptyLead(false)] } : d
    ))
  }

  function removeLead(deptIdx: number, leadIdx: number) {
    setDeptLeads(prev => prev.map((d, di) => {
      if (di !== deptIdx) return d
      const next = d.leads.filter((_, li) => li !== leadIdx)
      // If we removed the primary, promote the first remaining lead
      if (!next.some(l => l.is_primary) && next.length > 0) next[0].is_primary = true
      return { ...d, leads: next.length > 0 ? next : [emptyLead(true)] }
    }))
  }

  function setPrimary(deptIdx: number, leadIdx: number) {
    setDeptLeads(prev => prev.map((d, di) => {
      if (di !== deptIdx) return d
      return { ...d, leads: d.leads.map((l, li) => ({ ...l, is_primary: li === leadIdx })) }
    }))
  }

  async function handleContinue() {
    const primaryMissing = deptLeads.some(d => {
      const primary = d.leads.find(l => l.is_primary)
      return !primary?.name.trim() || !primary?.email.trim()
    })
    if (primaryMissing && !warningShown) {
      setWarningShown(true)
      return
    }

    setSaving(true)
    setError('')
    setWarningShown(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    const { data: existing } = await supabase.from('departments').select('*').eq('firm_id', firm.id)
    const existingByName = new Map(((existing ?? []) as Department[]).map(d => [d.name.toLowerCase().trim(), d]))

    const { data: profileData } = await supabase.from('firm_profiles').select('service_lines').eq('firm_id', firm.id).single()
    const serviceLines = ((profileData?.service_lines ?? []) as ServiceLine[])

    await supabase.from('departments').delete().eq('firm_id', firm.id)

    const { error: insertError } = await supabase.from('departments').insert(
      deptLeads.map(dept => {
        const prev = existingByName.get(dept.deptName.toLowerCase().trim())
        const sl = serviceLines.find(s => s.name.toLowerCase().trim() === dept.deptName.toLowerCase().trim())
        const primary = dept.leads.find(l => l.is_primary) ?? dept.leads[0]
        return {
          firm_id: firm.id,
          name: dept.deptName,
          capabilities: prev?.capabilities ?? sl?.description ?? '',
          what_we_do: prev?.what_we_do ?? sl?.description ?? '',
          specific_services: prev?.specific_services ?? '',
          contract_types_won: prev?.contract_types_won ?? sl?.typical_clients ?? '',
          keywords_synonyms: prev?.keywords_synonyms ?? sl?.contract_keywords ?? '',
          target_sectors: prev?.target_sectors ?? [],
          lead_name: primary?.name ?? '',
          lead_email: primary?.email ?? '',
          leads: dept.leads,
          direct_notify_employees: prev?.direct_notify_employees ?? false,
        }
      })
    )

    if (insertError) { setError(insertError.message); setSaving(false); return }
    router.push('/onboarding/employees')
  }

  if (loading) {
    return (
      <OnboardingShell step={6} title="Department Leads" subtitle="Assign leads to each department. Add sub-leads for specific delivery capabilities.">
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
      </OnboardingShell>
    )
  }

  if (deptLeads.length === 0) {
    return (
      <OnboardingShell step={6} title="Department Leads" subtitle="Assign leads to each department. Add sub-leads for specific delivery capabilities.">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-slate-500 text-sm">
          <p>No departments found. <button type="button" onClick={() => router.push('/onboarding/departments-setup')} className="text-indigo-600 underline">Go back and add your departments first.</button></p>
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      step={6}
      title="Department Leads"
      subtitle="Assign a primary lead to each department, then optionally add sub-leads for specific delivery capabilities."
    >
      <div className="space-y-4">

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800">
          <strong>Leads only — not staff.</strong> The leads here are the decision-makers for contract opportunities. You'll add the broader team in the next step. Sub-leads can be routed to specific delivery types — e.g. your Design lead only gets alerted on design contracts.
        </div>

        {deptLeads.map((dept, di) => (
          <div key={di} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{dept.deptName}</h3>
              {dept.availableCapabilities.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {dept.availableCapabilities.join(' · ')}
                </p>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {dept.leads.map((lead, li) => (
                <div key={li} className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lead.is_primary ? (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">Primary lead</span>
                      ) : (
                        <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Sub-lead</span>
                      )}
                      {!lead.is_primary && (
                        <button
                          type="button"
                          onClick={() => setPrimary(di, li)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Make primary
                        </button>
                      )}
                    </div>
                    {!lead.is_primary && (
                      <button
                        type="button"
                        onClick={() => removeLead(di, li)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Name {lead.is_primary && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={lead.name}
                        onChange={e => updateLead(di, li, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Sarah Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Email {lead.is_primary && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="email"
                        value={lead.email}
                        onChange={e => updateLead(di, li, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="sarah.johnson@firm.com"
                      />
                    </div>
                  </div>

                  {!lead.is_primary && dept.availableCapabilities.length > 0 && (
                    <CapabilityToggle
                      available={dept.availableCapabilities}
                      selected={lead.capabilities}
                      onChange={v => updateLead(di, li, 'capabilities', v)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => addLead(di)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                + Add sub-lead
              </button>
              {dept.availableCapabilities.length > 0 && (
                <span className="text-xs text-slate-400 ml-2">Sub-leads can be scoped to specific capabilities</span>
              )}
            </div>
          </div>
        ))}

        {warningShown && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
            <p><strong>Some departments have no primary lead assigned.</strong> Alerts cannot be routed to them until this is completed. You can update leads in Settings at any time.</p>
            <p className="text-xs text-amber-700">Click Continue again to proceed anyway.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/onboarding/contract-types')}
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
