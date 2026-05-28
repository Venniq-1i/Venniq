'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Contract } from '@/types'
import { Suspense } from 'react'

type Status = 'pending' | 'running' | 'done' | 'no_match' | 'error'

interface ContractStatus {
  id: string
  title: string
  status: Status
  error?: string
  runId?: string
}

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

const STATUS_COLORS: Record<Status, string> = {
  pending:  '#F5F7FF',
  running:  '#EFF4FF',
  done:     '#F0FDF9',
  no_match: '#F8F9FA',
  error:    '#FFF5F5',
}

const STATUS_BORDERS: Record<Status, string> = {
  pending:  '#D8E4FF',
  running:  '#C2D4F8',
  done:     '#B6EDD9',
  no_match: '#E2E8F0',
  error:    '#FFC5C5',
}

const DOT_COLORS: Record<Status, string> = {
  pending:  '#C2D4F8',
  running:  '#1A6FFF',
  done:     '#4ACEA6',
  no_match: '#8BA4CC',
  error:    '#FF5C5C',
}

const STATUS_LABELS: Record<Status, string> = {
  pending:  'Queued',
  running:  'Analysing…',
  done:     'Matched',
  no_match: 'No match',
  error:    'Error',
}

const BADGE_COLORS: Record<Status, { bg: string; color: string }> = {
  pending:  { bg: '#EEF2FF', color: '#8BA4CC' },
  running:  { bg: '#EFF4FF', color: '#1A6FFF' },
  done:     { bg: '#ECFDF5', color: '#4ACEA6' },
  no_match: { bg: '#F1F5F9', color: '#8BA4CC' },
  error:    { bg: '#FFF5F5', color: '#FF5C5C' },
}

function MatchingContent() {
  const [statuses, setStatuses] = useState<ContractStatus[]>([])
  const [runIds, setRunIds] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const ran = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    if (!ids.length) { router.push('/contracts'); return }

    async function init() {
      const { data } = await supabase.from('contracts').select('*').in('id', ids)
      const contractList = (data ?? []) as Contract[]
      setContracts(contractList)
      setStatuses(contractList.map(c => ({ id: c.id, title: c.title, status: 'pending' })))
      runAll(contractList)
    }
    init()
  }, [])

  async function runAll(contractList: Contract[]) {
    setRunning(true)
    const collected: string[] = []

    for (const contract of contractList) {
      setStatuses(prev => prev.map(s => s.id === contract.id ? { ...s, status: 'running' } : s))

      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: contract.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

        if (data.status === 'no_match') {
          setStatuses(prev => prev.map(s => s.id === contract.id ? { ...s, status: 'no_match' } : s))
        } else {
          if (data.runId) collected.push(data.runId)
          setStatuses(prev => prev.map(s => s.id === contract.id ? { ...s, status: 'done', runId: data.runId } : s))
        }
      } catch (err) {
        setStatuses(prev => prev.map(s => s.id === contract.id ? { ...s, status: 'error', error: (err as Error).message } : s))
      }
    }

    setRunIds(collected)
    setRunning(false)
  }

  const doneCount    = statuses.filter(s => s.status === 'done').length
  const errorCount   = statuses.filter(s => s.status === 'error').length
  const noMatchCount = statuses.filter(s => s.status === 'no_match').length
  const allDone      = !running && statuses.length > 0 && doneCount + errorCount + noMatchCount === statuses.length
  const progress     = statuses.length ? Math.round(((doneCount + errorCount + noMatchCount) / statuses.length) * 100) : 0

  function viewReports() {
    router.push(`/reports?${new URLSearchParams({ runIds: runIds.join(',') })}`)
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={eyebrow}>AI Matching</span>
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.05 }}>
          {running ? 'Analysing contracts…' : allDone ? <>Matching <em style={{ color: '#4ACEA6', fontStyle: 'italic' }}>complete</em></> : 'Starting…'}
        </h1>
        <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>
          Claude is analysing each contract against your team's employment histories.
        </p>
      </div>

      {/* Progress card */}
      <div style={{ ...card, padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F' }}>
            {running ? 'In progress' : allDone ? 'Complete' : 'Starting…'}
          </span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '24px', color: '#1A6FFF' }}>{progress}%</span>
        </div>
        <div style={{ background: '#EEF2FF', borderRadius: '100px', height: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#1A6FFF', height: '4px', borderRadius: '100px', width: `${progress}%`, transition: 'width 0.5s' }} />
        </div>
        <p style={{ fontSize: '12px', color: '#8BA4CC', marginTop: '10px' }}>
          {doneCount} matched · {noMatchCount} no match · {errorCount} errors · {statuses.length - doneCount - noMatchCount - errorCount} remaining
        </p>
      </div>

      {/* Contract status list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
        {statuses.map(s => (
          <div key={s.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '14px 16px',
            background: STATUS_COLORS[s.status],
            border: `0.5px solid ${STATUS_BORDERS[s.status]}`,
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: DOT_COLORS[s.status],
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
              {s.error && <p style={{ fontSize: '12px', color: '#FF5C5C', marginTop: '2px' }}>{s.error}</p>}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px', background: BADGE_COLORS[s.status].bg, color: BADGE_COLORS[s.status].color, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
              {STATUS_LABELS[s.status]}
            </span>
          </div>
        ))}
      </div>

      {allDone && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.push('/contracts')} style={{ fontSize: '13px', color: '#536180', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ← Back to contracts
          </button>
          <button
            onClick={viewReports}
            disabled={runIds.length === 0}
            style={{ padding: '10px 22px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: runIds.length === 0 ? 'not-allowed' : 'pointer', opacity: runIds.length === 0 ? 0.5 : 1, letterSpacing: '-0.01em' }}
          >
            View Reports ({doneCount}) →
          </button>
        </div>
      )}
    </div>
  )
}

export default function MatchingPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px', color: '#8BA4CC', fontSize: '14px' }}>Loading…</div>}>
      <MatchingContent />
    </Suspense>
  )
}
