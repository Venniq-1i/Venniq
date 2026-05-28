'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import { parseEmployeeCSV, generateCSVTemplate } from '@/lib/csvParser'
import type { ParsedEmployee } from '@/types'

export default function EmployeesStep() {
  const [employees, setEmployees] = useState<ParsedEmployee[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseEmployeeCSV(ev.target?.result as string)
        setEmployees(parsed)
        setParseError('')
      } catch (err) {
        setParseError((err as Error).message)
        setEmployees(null)
      }
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'venniq_employees_template.csv'
    a.click()
  }

  async function handleContinue() {
    if (!employees?.length) { setError('Please upload a valid employee CSV first.'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (!firm) { setError('Firm not found.'); setSaving(false); return }

    // Get departments for name→id lookup
    const { data: departments } = await supabase.from('departments').select('id, name').eq('firm_id', firm.id)
    const deptMap = new Map((departments ?? []).map(d => [d.name.toLowerCase(), d.id]))

    // Delete old employees
    await supabase.from('employees').delete().eq('firm_id', firm.id)

    // Insert employees in batches
    for (const emp of employees) {
      const deptId = deptMap.get(emp.department.toLowerCase())
      const { data: newEmp, error: empError } = await supabase.from('employees').insert({
        firm_id: firm.id,
        department_id: deptId ?? null,
        name: emp.name,
        email: emp.email,
        education: emp.education ?? null,
        region: emp.region ?? null,
        proxycurl_enriched: false,
      }).select('id').single()

      if (empError || !newEmp) continue

      if (emp.previousEmployers.length > 0) {
        await supabase.from('employment_history').insert(
          emp.previousEmployers.map(h => ({
            employee_id: newEmp.id,
            company: h.company,
            from_year: h.from,
            to_year: h.to,
          }))
        )
      }
    }

    router.push('/onboarding/sources')
  }

  return (
    <OnboardingShell step={7} title="Employee Import" subtitle="Upload your team. The AI uses their employment history to identify relationship capital.">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Upload staff CSV</h3>
            <p className="text-sm text-slate-500">
              Required columns: <code className="bg-slate-100 px-1 rounded text-xs">name</code>, <code className="bg-slate-100 px-1 rounded text-xs">email</code>, <code className="bg-slate-100 px-1 rounded text-xs">department</code>, <code className="bg-slate-100 px-1 rounded text-xs">previous_employers</code>
              <br />
              Optional: <code className="bg-slate-100 px-1 rounded text-xs">education</code>, <code className="bg-slate-100 px-1 rounded text-xs">region</code>
              <br />
              Previous employers format: <code className="bg-slate-100 px-1 rounded text-xs">Company:2019:2023|OtherCo:2015:2019</code>
            </p>
          </div>
          <button onClick={downloadTemplate} className="shrink-0 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap">
            Download template
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <p className="text-sm text-slate-500">
            {employees ? `✓ ${employees.length} employees loaded` : 'Click to upload CSV'}
          </p>
        </div>

        {parseError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{parseError}</p>}

        {employees && employees.length > 0 && (
          <div className="overflow-auto max-h-64 rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">Previous Employers</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{emp.name}</td>
                    <td className="px-3 py-2 text-slate-600">{emp.department}</td>
                    <td className="px-3 py-2 text-slate-500">{emp.previousEmployers.map(h => h.company).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-2">
          <button onClick={() => router.push('/onboarding/leads')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">← Back</button>
          <button onClick={handleContinue} disabled={saving || !employees?.length}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
