'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { Department } from '@/types'

export default function NotificationsStep() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return
      const { data } = await supabase.from('departments').select('*').eq('firm_id', firm.id)
      if (data) setDepartments(data)
    }
    load()
  }, [])

  function toggleDirectNotify(id: string) {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, direct_notify_employees: !d.direct_notify_employees } : d))
  }

  async function handleFinish() {
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Update each department's direct_notify_employees
    for (const dept of departments) {
      await supabase.from('departments')
        .update({ direct_notify_employees: dept.direct_notify_employees })
        .eq('id', dept.id)
    }

    // Generate and save the profile markdown now that all config is complete
    const { data: firm } = await supabase.from('firms').select('id, name').eq('owner_id', user.id).single()
    if (firm) {
      const { data: profile } = await supabase.from('firm_profiles').select('*').eq('firm_id', firm.id).single()
      if (profile) {
        const { buildProfileMarkdown } = await import('@/lib/relevanceProfile')
        const markdown = buildProfileMarkdown(firm.name, profile, departments)
        await supabase.from('firm_profiles').update({ profile_markdown: markdown }).eq('firm_id', firm.id)
      }

      // Mark onboarding complete
      await supabase.from('firms').update({ onboarding_complete: true }).eq('id', firm.id)
    }

    router.push('/contracts')
  }

  return (
    <OnboardingShell step={9} title="Notification Settings" subtitle="Configure who receives alerts. Dept heads always receive them — optionally also notify the matched employees directly.">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
          <strong className="text-slate-800">Default:</strong> AI-generated alerts are sent to the department lead for each matched opportunity. This is always on.
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 mb-1">Direct employee notification <span className="text-slate-400 font-normal text-sm">(optional)</span></h3>
          <p className="text-sm text-slate-500 mb-4">When enabled, a personalised email is also sent to the matched employee(s). It tells them they've been flagged, names their department lead, and lists colleagues also identified. The dept lead remains the decision-maker — no response buttons in the employee email.</p>

          <div className="space-y-3">
            {departments.length === 0 && (
              <p className="text-sm text-slate-400 italic">Loading departments…</p>
            )}
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{dept.name}</p>
                  <p className="text-xs text-slate-500">Lead: {dept.lead_name} · {dept.lead_email}</p>
                </div>
                <button
                  onClick={() => toggleDirectNotify(dept.id)}
                  className={`relative w-10 rounded-full transition-colors flex-shrink-0 ${dept.direct_notify_employees ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  style={{ height: '22px' }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dept.direct_notify_employees ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button onClick={() => router.push('/onboarding/sources')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">← Back</button>
          <button onClick={handleFinish} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Finishing setup…' : 'Finish Setup →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
