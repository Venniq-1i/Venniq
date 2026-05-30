'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { classifyIntent } from '@/lib/relevanceProfile'
import type { Contract, FirmProfile, IntentMode } from '@/types'

const MODE_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  A:  { label: 'Mode A — Sales', bg: '#FFFBEB', color: '#F5A623' },
  B:  { label: 'Mode B — Bid',   bg: '#EFF4FF', color: '#1A6FFF' },
  AB: { label: 'Mode A + B',     bg: '#F5F7FF', color: '#536180' },
}

const SOURCE_LABELS: Record<string, string> = {
  contracts_finder: 'Contracts Finder',
  find_a_tender:    'Find a Tender',
  proactis:         'Proactis',
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  early_engagement:   { label: 'Early Engagement',  color: '#1A6FFF' },
  future_opportunity: { label: 'Future Opportunity', color: '#5B9BFF' },
  opportunity:        { label: 'Opportunity',         color: '#4ACEA6' },
  awarded:            { label: 'Awarded Contract',    color: '#8BA4CC' },
}

const eyebrow: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#1A6FFF',
  marginBottom: '4px',
}

function fmtValue(low: number | null, high: number | null, value: number) {
  const fmt = (v: number) => v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`
  if (low && high && Math.abs(low - high) > 1000) return `${fmt(Math.min(low, high))} – ${fmt(Math.max(low, high))}`
  return fmt(value)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function ContractCard({ contract, isSelected, onToggle, mode }: {
  contract: Contract
  isSelected: boolean
  onToggle: () => void
  mode: IntentMode
}) {
  const [expanded, setExpanded] = useState(false)
  const [awardedExpanded, setAwardedExpanded] = useState(false)
  const days = contract.deadline ? daysUntil(contract.deadline) : null
  const sourceLabel = SOURCE_LABELS[contract.source] ?? contract.source
  const hasFullDesc = contract.full_description && contract.full_description.length > (contract.description?.length ?? 0)
  const stage = contract.procurement_stage ? STAGE_CONFIG[contract.procurement_stage] : null
  const isAwarded = contract.procurement_stage === 'awarded'
  const modeStyle = mode ? MODE_BADGES[mode] : null

  return (
    <div style={{
      background: '#ffffff',
      border: isSelected ? '1.5px solid #1A6FFF' : '0.5px solid #D8E4FF',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Clickable header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '18px 20px', cursor: 'pointer' }} onClick={onToggle}>
        {/* Checkbox */}
        <div style={{
          marginTop: '2px', width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
          border: isSelected ? 'none' : '1.5px solid #C2D4F8',
          background: isSelected ? '#1A6FFF' : '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}>
          {isSelected && <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#0D1E4F', margin: '0 0 3px', lineHeight: 1.4 }}>{contract.title}</p>
              <p style={{ fontSize: '13px', color: '#536180', margin: 0, fontWeight: 300 }}>{contract.issuer}</p>
            </div>
            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: '20px', fontWeight: 400, color: '#0D1E4F' }}>
                {fmtValue(contract.value_low, contract.value_high, contract.value)}
              </span>
              {stage && (
                <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px', background: `${stage.color}18`, color: stage.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stage.color, display: 'inline-block' }} />
                  {stage.label}
                </span>
              )}
              {contract.ai_confidence !== null && contract.ai_confidence !== undefined && (
                <span style={{
                  fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px',
                  background: contract.ai_confidence >= 80 ? '#ECFDF5' : contract.ai_confidence >= 60 ? '#FFFBEB' : '#F1F5F9',
                  color: contract.ai_confidence >= 80 ? '#4ACEA6' : contract.ai_confidence >= 60 ? '#F5A623' : '#8BA4CC',
                }}>
                  AI {contract.ai_confidence}% match
                </span>
              )}
              {days !== null && (
                <span style={{ fontSize: '11px', color: days <= 0 ? '#FF5C5C' : days <= 14 ? '#F5A623' : '#8BA4CC' }}>
                  {days > 0 ? `${days}d left` : 'Deadline passed'}
                </span>
              )}
              {modeStyle && (
                <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 9px', borderRadius: '100px', background: modeStyle.bg, color: modeStyle.color }}>
                  {modeStyle.label}
                </span>
              )}
            </div>
          </div>

          {/* AI Overview */}
          {contract.ai_rationale && (
            <div style={{ marginTop: '10px', background: '#EFF4FF', border: '0.5px solid #C2D4F8', borderRadius: '6px', padding: '10px 12px' }}>
              <span style={{ ...eyebrow, color: '#1A6FFF' }}>AI Overview</span>
              <p style={{ fontSize: '12px', color: '#536180', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>{contract.ai_rationale}</p>
            </div>
          )}

          {/* Awarded contract */}
          {isAwarded && contract.awarded_supplier && (
            <div style={{ marginTop: '10px', background: '#F5F7FF', border: '0.5px solid #D8E4FF', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <span style={eyebrow}>Awarded to</span>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#0D1E4F', margin: 0 }}>{contract.awarded_supplier}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setAwardedExpanded(v => !v) }} style={{ fontSize: '12px', color: '#1A6FFF', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  {awardedExpanded ? 'Hide details' : 'See details'}
                </button>
              </div>
              {awardedExpanded && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid #D8E4FF', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {contract.awarded_date && <p style={{ fontSize: '12px', color: '#536180', margin: 0 }}><span style={{ color: '#8BA4CC' }}>Award date: </span>{fmtDate(contract.awarded_date)}</p>}
                  {contract.awarded_value && <p style={{ fontSize: '12px', color: '#536180', margin: 0 }}><span style={{ color: '#8BA4CC' }}>Confirmed value: </span><span style={{ fontWeight: 500 }}>{fmtValue(null, null, contract.awarded_value)}</span></p>}
                  {contract.companies_house_url && (
                    <a href={contract.companies_house_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: '#1A6FFF', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                      Search on Companies House
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                  <p style={{ fontSize: '12px', color: '#8BA4CC', margin: 0, fontStyle: 'italic', fontWeight: 300 }}>Staff who previously worked at {contract.awarded_supplier} may have relationships supporting future phases.</p>
                </div>
              )}
            </div>
          )}

          {/* Department tags */}
          {contract.ai_departments?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
              {contract.ai_departments.map(d => (
                <span key={d} style={{ fontSize: '11px', background: '#EFF4FF', color: '#1A6FFF', padding: '2px 8px', borderRadius: '4px' }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div style={{ borderTop: '0.5px solid #EEF2FF', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#0D1E4F' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ACEA6', display: 'inline-block' }} />
          {sourceLabel}
        </span>
        <span style={{ fontSize: '12px', color: '#8BA4CC' }}>Ref: <span style={{ fontFamily: 'monospace', color: '#536180' }}>{contract.reference}</span></span>
        {contract.published_at && <span style={{ fontSize: '12px', color: '#8BA4CC' }}>Published: {fmtDate(contract.published_at)}</span>}
        {contract.deadline && <span style={{ fontSize: '12px', color: '#8BA4CC' }}>Deadline: {fmtDate(contract.deadline)}</span>}
        <div style={{ flex: 1 }} />
        {hasFullDesc && (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }} style={{ fontSize: '12px', color: '#1A6FFF', background: 'none', border: 'none', cursor: 'pointer' }}>
            {expanded ? 'Hide description' : 'Official description'}
          </button>
        )}
        {contract.source_url ? (
          <a href={contract.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: '#1A6FFF', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            View on {sourceLabel}
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        ) : (
          <span style={{ fontSize: '12px', color: '#8BA4CC' }}>Source: {sourceLabel} · Ref: {contract.reference}</span>
        )}
      </div>

      {/* Expandable description */}
      {expanded && contract.full_description && (
        <div style={{ borderTop: '0.5px solid #EEF2FF', padding: '16px 20px' }}>
          <span style={eyebrow}>Official Description (from {sourceLabel})</span>
          <p style={{ fontSize: '12px', color: '#536180', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontWeight: 300 }}>{contract.full_description}</p>
        </div>
      )}
    </div>
  )
}

type StatusFilter = 'all' | 'new' | 'matched' | 'no_match'
const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'new', label: 'Pending' },
  { key: 'matched', label: 'Matched' }, { key: 'no_match', label: 'Rejected' },
]

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [profile, setProfile] = useState<FirmProfile | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchResult, setFetchResult] = useState<{ rawFetched: number; filtered: number; ingested: number; error?: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
      if (!firm) return

      const [{ data: contractData }, { data: profileData }] = await Promise.all([
        supabase.from('contracts').select('*').eq('firm_id', firm.id).order('ingested_at', { ascending: false }),
        supabase.from('firm_profiles').select('*').eq('firm_id', firm.id).single(),
      ])

      setContracts(contractData ?? [])
      setProfile(profileData ?? null)
      setSelected(new Set((contractData ?? []).map((c: Contract) => c.id)))
      setLoading(false)
    }
    load()
  }, [])

  async function fetchContracts() {
    setFetching(true); setFetchResult(null)
    const postRes = await fetch('/api/contracts', { method: 'POST' })
    const postData = await postRes.json()
    if (!postRes.ok) {
      setFetchResult({ rawFetched: 0, filtered: 0, ingested: 0, error: postData.error ?? 'Something went wrong' })
      setFetching(false)
      return
    }
    setFetchResult({ rawFetched: postData.rawFetched ?? 0, filtered: postData.filtered ?? 0, ingested: postData.ingested ?? 0 })
    const res = await fetch('/api/contracts')
    const data = await res.json()
    const fresh = data.contracts as Contract[]
    setContracts(fresh)
    setSelected(new Set(fresh.filter(c => c.status === 'new').map(c => c.id)))
    setFetching(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function runMatching() {
    const ids = Array.from(selected)
    if (!ids.length) return
    router.push(`/matching?${new URLSearchParams({ ids: ids.join(',') })}`)
  }

  const pipelineValue = contracts.filter(c => selected.has(c.id)).reduce((sum, c) => sum + c.value, 0)
  const fmtTotal = (v: number) => v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`

  if (loading) return <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px', color: '#8BA4CC', fontSize: '14px' }}>Loading contracts…</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
        <div>
          <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1A6FFF', marginBottom: '8px' }}>Contracts</span>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '32px', fontWeight: 400, color: '#0D1E4F', margin: 0, lineHeight: 1.05 }}>
            Live <em style={{ color: '#1A6FFF', fontStyle: 'italic' }}>feed</em>
          </h1>
          <p style={{ fontSize: '14px', color: '#536180', marginTop: '8px', fontWeight: 300 }}>UK Contracts Finder — filtered by your relevance profile.</p>
        </div>
        <button onClick={fetchContracts} disabled={fetching} style={{ padding: '10px 20px', background: '#ffffff', color: '#0D2A8C', border: '1.5px solid #0D2A8C', borderRadius: '6px', fontSize: '13px', fontWeight: 400, cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {fetching ? 'Fetching…' : '↻ Fetch latest'}
        </button>
      </div>

      {/* Fetch result banner */}
      {fetchResult && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
          ...(fetchResult.ingested === 0 && fetchResult.rawFetched > 0
            ? { background: '#FFFBEB', color: '#92400E', border: '0.5px solid #FCD34D' }
            : fetchResult.rawFetched === 0
            ? { background: '#FFF5F5', color: '#991B1B', border: '0.5px solid #FCA5A5' }
            : { background: '#ECFDF5', color: '#065F46', border: '0.5px solid #6EE7B7' }),
        }}>
          {fetchResult.error ? fetchResult.error
        : fetchResult.rawFetched === 0 ? 'No contracts returned — the API may be temporarily unavailable.'
            : fetchResult.filtered === 0 ? <span>Returned <strong>{fetchResult.rawFetched}</strong> contracts, but <strong>none matched</strong> your profile.</span>
            : <span>Fetched <strong>{fetchResult.rawFetched}</strong> → AI kept <strong>{fetchResult.filtered}</strong> → <strong>{fetchResult.ingested}</strong> new{fetchResult.ingested !== fetchResult.filtered ? ` (${fetchResult.filtered - fetchResult.ingested} already in library)` : ''}.</span>}
        </div>
      )}

      {contracts.length === 0 ? (
        <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#8BA4CC', fontSize: '14px', marginBottom: '16px' }}>No contracts yet. Fetch from Contracts Finder to get started.</p>
          <button onClick={fetchContracts} disabled={fetching} style={{ padding: '10px 22px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.5 : 1 }}>
            {fetching ? 'Fetching…' : 'Fetch contracts'}
          </button>
        </div>
      ) : (() => {
        const visibleContracts = statusFilter === 'all' ? contracts : contracts.filter(c => c.status === statusFilter)
        const pendingContracts = visibleContracts.filter(c => c.status === 'new')

        return (
          <>
            {/* Status filter tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '16px', background: '#EEF2FF', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
              {STATUS_TABS.map(tab => {
                const count = tab.key === 'all' ? contracts.length : contracts.filter(c => c.status === tab.key).length
                const isActive = statusFilter === tab.key
                return (
                  <button key={tab.key} onClick={() => setStatusFilter(tab.key)} style={{
                    padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                    background: isActive ? '#ffffff' : 'transparent', color: isActive ? '#0D1E4F' : '#8BA4CC',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: isActive ? '0 1px 3px rgba(13,30,79,0.08)' : 'none',
                  }}>
                    {tab.label}
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '100px', background: isActive ? '#EFF4FF' : '#E2E8F0', color: isActive ? '#1A6FFF' : '#8BA4CC' }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {statusFilter !== 'no_match' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: '#536180' }}>{selected.size} selected · {fmtTotal(pipelineValue)} pipeline</span>
                <button onClick={() => setSelected(new Set(pendingContracts.map(c => c.id)))} style={{ fontSize: '12px', color: '#1A6FFF', background: 'none', border: 'none', cursor: 'pointer' }}>Select pending</button>
                <button onClick={() => setSelected(new Set())} style={{ fontSize: '12px', color: '#8BA4CC', background: 'none', border: 'none', cursor: 'pointer' }}>Deselect all</button>
              </div>
            )}

            {statusFilter === 'no_match' && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#536180', background: '#F5F7FF', border: '0.5px solid #D8E4FF' }}>
                These contracts were fetched but the AI judged them irrelevant. Review to calibrate your relevance settings.
              </div>
            )}

            {visibleContracts.length === 0 ? (
              <div style={{ background: '#ffffff', border: '0.5px solid #D8E4FF', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#8BA4CC', fontSize: '13px' }}>
                No contracts in this category yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {visibleContracts.map(contract => (
                  <ContractCard key={contract.id} contract={contract} isSelected={selected.has(contract.id)} onToggle={() => toggleSelect(contract.id)} mode={profile ? classifyIntent(contract, profile) : null} />
                ))}
              </div>
            )}

            {statusFilter !== 'no_match' && selected.size > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={runMatching} disabled={selected.size === 0} style={{ padding: '12px 28px', background: '#1A6FFF', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: selected.size === 0 ? 'not-allowed' : 'pointer', opacity: selected.size === 0 ? 0.5 : 1, letterSpacing: '-0.01em' }}>
                  Run AI Matching ({selected.size}) →
                </button>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
