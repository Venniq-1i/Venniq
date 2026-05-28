import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(v: number) { return v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k` }

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '0.5px solid #D8E4FF',
  borderRadius: '12px',
}

const eyebrow: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#1A6FFF',
  marginBottom: '8px',
}

const metricNum: React.CSSProperties = {
  fontFamily: "'Instrument Serif', serif",
  fontSize: '38px',
  fontWeight: 400,
  lineHeight: 1.05,
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: firm } = await supabase.from('firms').select('id, name, onboarding_complete').eq('owner_id', user.id).single()
  if (!firm) redirect('/signup')
  if (!firm.onboarding_complete) redirect('/onboarding/firm')

  const [
    { count: contractsIngested },
    { count: contractsMatched },
    { data: matchingRuns },
    { data: departments },
  ] = await Promise.all([
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('firm_id', firm.id),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('firm_id', firm.id).eq('status', 'matched'),
    supabase.from('matching_runs').select('matched_departments, intent_mode').eq('firm_id', firm.id),
    supabase.from('departments').select('id, name').eq('firm_id', firm.id),
  ])

  const { data: runIds } = await supabase.from('matching_runs').select('id').eq('firm_id', firm.id)
  const runIdList = (runIds ?? []).map((r: any) => r.id)
  const { data: allAlerts } = runIdList.length > 0
    ? await supabase.from('alerts').select('*').in('matching_run_id', runIdList).eq('alert_type', 'dept_head')
    : { data: [] }

  const totalAlerts = allAlerts?.length ?? 0
  const statusCounts = {
    looking:      (allAlerts ?? []).filter((a: any) => a.status === 'looking').length,
    pursuing:     (allAlerts ?? []).filter((a: any) => a.status === 'pursuing').length,
    not_relevant: (allAlerts ?? []).filter((a: any) => a.status === 'not_relevant').length,
    no_response:  (allAlerts ?? []).filter((a: any) => a.status === 'sent').length,
  }

  const allRuns = matchingRuns ?? []
  const totalCandidates = allRuns.reduce((sum: number, r: any) =>
    sum + (r.matched_departments ?? []).reduce((s: number, d: any) => s + (d.candidates?.length ?? 0), 0), 0)

  const deptAlertCounts: Record<string, { name: string; total: number; pursuing: number }> = {}
  if (allAlerts && departments) {
    for (const alert of allAlerts as any[]) {
      const deptId = alert.department_id
      if (!deptId) continue
      if (!deptAlertCounts[deptId]) {
        const dept = (departments as any[]).find(d => d.id === deptId)
        deptAlertCounts[deptId] = { name: dept?.name ?? 'Unknown', total: 0, pursuing: 0 }
      }
      deptAlertCounts[deptId].total++
      if (alert.status === 'pursuing') deptAlertCounts[deptId].pursuing++
    }
  }

  const { data: matchedContracts } = await supabase.from('contracts').select('value').eq('firm_id', firm.id).eq('status', 'matched')
  const pipelineValue = (matchedContracts ?? []).reduce((sum: number, c: any) => sum + (c.value ?? 0), 0)

  const { data: allContractsStage } = await supabase.from('contracts').select('procurement_stage, value').eq('firm_id', firm.id)

  const stageCounts: Record<string, { label: string; count: number; value: number; color: string }> = {
    opportunity:        { label: 'Opportunity',        count: 0, value: 0, color: '#4ACEA6' },
    awarded:            { label: 'Awarded Contract',   count: 0, value: 0, color: '#8BA4CC' },
    future_opportunity: { label: 'Future Opportunity', count: 0, value: 0, color: '#5B9BFF' },
    early_engagement:   { label: 'Early Engagement',  count: 0, value: 0, color: '#1A6FFF' },
  }
  for (const c of (allContractsStage ?? []) as any[]) {
    const s = c.procurement_stage ?? 'opportunity'
    if (stageCounts[s]) { stageCounts[s].count++; stageCounts[s].value += c.value ?? 0 }
  }
  const stageList = Object.values(stageCounts).filter(s => s.count > 0)
  const deptList = Object.values(deptAlertCounts).sort((a, b) => b.total - a.total)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', gap: '16px' }}>
        <div>
          <span style={eyebrow}>Leadership Dashboard</span>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '36px', fontWeight: 400, color: '#0D1E4F', lineHeight: 1.05, letterSpacing: '-0.025em', margin: 0 }}>
            {firm.name} — <em style={{ fontStyle: 'italic', color: '#1A6FFF' }}>live</em>
          </h1>
          <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>Pipeline visibility and real-time response tracking</p>
        </div>
        <Link href="/contracts" style={{ background: '#1A6FFF', color: '#ffffff', padding: '10px 22px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap' }}>
          + New contracts
        </Link>
      </div>

      {/* 4-col metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Contracts Ingested', value: contractsIngested ?? 0, color: '#0D1E4F' },
          { label: 'Contracts Matched',  value: contractsMatched ?? 0,  color: '#1A6FFF' },
          { label: 'Depts Alerted',      value: totalAlerts,             color: '#1A6FFF' },
          { label: 'Candidates',         value: totalCandidates,         color: '#4ACEA6' },
        ].map(m => (
          <div key={m.label} style={{ ...card, padding: '20px' }}>
            <span style={eyebrow}>{m.label}</span>
            <p style={{ ...metricNum, color: m.color, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline value + response */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ ...card, padding: '24px' }}>
          <span style={eyebrow}>Estimated Pipeline Value</span>
          <p style={{ ...metricNum, color: '#1A6FFF', fontSize: '44px', margin: 0 }}>{fmt(pipelineValue)}</p>
          <p style={{ fontSize: '13px', color: '#8BA4CC', marginTop: '8px', fontWeight: 300 }}>Sum of all matched contract values</p>
        </div>

        <div style={{ ...card, padding: '24px' }}>
          <span style={eyebrow}>Alert Response Tracking</span>
          {totalAlerts === 0 ? (
            <p style={{ fontSize: '14px', color: '#8BA4CC', marginTop: '8px', fontStyle: 'italic' }}>No alerts sent yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {[
                { label: 'Looking Into It',   count: statusCounts.looking,      color: '#1A6FFF' },
                { label: 'Actively Pursuing', count: statusCounts.pursuing,     color: '#4ACEA6' },
                { label: 'Not Relevant',      count: statusCounts.not_relevant, color: '#8BA4CC' },
                { label: 'No Response',       count: statusCounts.no_response,  color: '#FF5C5C' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '112px', fontSize: '12px', color: '#536180', flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, background: '#EEF2FF', borderRadius: '100px', height: '4px' }}>
                    <div style={{ background: row.color, height: '4px', borderRadius: '100px', width: `${totalAlerts > 0 ? (row.count / totalAlerts) * 100 : 0}%`, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#0D1E4F', width: '24px', textAlign: 'right', flexShrink: 0 }}>{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Procurement Stage Pipeline */}
      {stageList.length > 0 && (
        <div style={{ ...card, padding: '24px', marginBottom: '12px' }}>
          <span style={eyebrow}>Pipeline by Procurement Stage</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
            {(['opportunity', 'awarded', 'future_opportunity', 'early_engagement'] as const).map(key => {
              const s = stageCounts[key]
              return (
                <div key={key} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${s.color}18`, border: `0.5px solid ${s.color}40`, borderRadius: '100px', padding: '3px 10px', marginBottom: '8px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', fontWeight: 500, color: s.color }}>{s.label}</span>
                  </div>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#0D1E4F', margin: 0 }}>{s.count}</p>
                  <p style={{ fontSize: '12px', color: '#8BA4CC', marginTop: '2px' }}>{fmt(s.value)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Department breakdown */}
      {deptList.length > 0 && (
        <div style={{ ...card, padding: '24px', marginBottom: '24px' }}>
          <span style={eyebrow}>Department Opportunity Exposure</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {deptList.map(dept => (
              <div key={dept.name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ width: '140px', fontSize: '13px', fontWeight: 500, color: '#0D1E4F', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                <div style={{ flex: 1, background: '#EEF2FF', borderRadius: '100px', height: '6px' }}>
                  <div style={{ background: '#1A6FFF', height: '6px', borderRadius: '100px', width: `${deptList[0].total > 0 ? (dept.total / deptList[0].total) * 100 : 0}%` }} />
                </div>
                <span style={{ fontSize: '12px', color: '#536180', flexShrink: 0, minWidth: '100px', textAlign: 'right' }}>
                  {dept.total} alert{dept.total !== 1 ? 's' : ''}
                  {dept.pursuing > 0 ? ` · ${dept.pursuing} pursuing` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Link href="/reports" style={{ padding: '10px 20px', background: '#ffffff', color: '#0D2A8C', border: '1.5px solid #0D2A8C', borderRadius: '6px', fontSize: '13px', fontWeight: 400, textDecoration: 'none' }}>
          View Reports
        </Link>
        <Link href="/contracts" style={{ padding: '10px 22px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', letterSpacing: '-0.01em' }}>
          New Analysis
        </Link>
      </div>
    </div>
  )
}
