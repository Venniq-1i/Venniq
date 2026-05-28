'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import type { ScrapedProfile } from '@/lib/claude/profileScraper'

const ALL_MARKETS = [
  'Transport', 'Central Government', 'Local Government', 'Healthcare',
  'Energy & Utilities', 'Defence', 'Housing & Real Estate', 'Financial Services',
  'Education', 'Environment', 'Justice & Emergency Services',
  'Digital / Technology', 'Construction', 'Infrastructure',
]

// Lightweight fuzzy check — true if the two names are likely the same firm.
function namesSimilar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  // Jaccard similarity over word sets
  const wa = new Set(na.split(' ').filter(Boolean))
  const wb = new Set(nb.split(' ').filter(Boolean))
  const intersection = [...wa].filter(w => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union >= 0.5
}

export default function FirmStep() {
  const [firmName, setFirmName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [companyOverview, setCompanyOverview] = useState('')
  const [coreMarkets, setCoreMarkets] = useState<string[]>([])
  const [customMarket, setCustomMarket] = useState('')
  const [geographicalFocus, setGeographicalFocus] = useState('')
  const [scrapedServiceLines, setScrapedServiceLines] = useState<ScrapedProfile['service_lines']>([])
  const [scrapeNote, setScrapeNote] = useState('')
  const [scraping, setScraping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Mismatch warning — non-blocking; shown when the scraped company name
  // doesn't appear to match what the user entered.
  const [nameMismatchWarning, setNameMismatchWarning] = useState<string | null>(null)
  const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Clear any stale onboarding session data from a previous company's run.
  useEffect(() => {
    sessionStorage.removeItem('venniq_scraped_service_lines')
    sessionStorage.removeItem('venniq_manual_entry_needed')
    sessionStorage.removeItem('venniq_from_firm_step')
  }, [])

  function toggleMarket(market: string) {
    setCoreMarkets(prev =>
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    )
  }

  function addCustomMarket() {
    const m = customMarket.trim()
    if (m && !coreMarkets.includes(m)) {
      setCoreMarkets(prev => [...prev, m])
    }
    setCustomMarket('')
  }

  async function scrapeWebsite() {
    if (!websiteUrl) return
    setScraping(true)
    setError('')
    setNameMismatchWarning(null)
    setMismatchAcknowledged(false)
    try {
      const res = await fetch('/api/profile/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      })
      const data = await res.json()
      if (data.profile) {
        const profile = data.profile as ScrapedProfile
        if (profile.company_overview) setCompanyOverview(profile.company_overview)
        if (profile.geographical_focus) setGeographicalFocus(profile.geographical_focus)
        if (profile.core_markets?.length) {
          setCoreMarkets(profile.core_markets)
        }
        if (profile.service_lines?.length) {
          setScrapedServiceLines(profile.service_lines)
        }
        if (profile.scrape_note) setScrapeNote(profile.scrape_note)

        // Validate that the firm name the user entered matches the website.
        if (profile.company_name && firmName.trim() && !namesSimilar(firmName, profile.company_name)) {
          setNameMismatchWarning(
            "The name you entered doesn't appear to match the business found at this URL. " +
            "Please confirm you have the right website before continuing."
          )
        }
      } else {
        setError(data.error ?? 'Could not read website. Please fill in manually.')
      }
    } catch {
      setError('Failed to fetch website. Please fill in manually.')
    } finally {
      setScraping(false)
    }
  }

  async function handleContinue() {
    if (!firmName.trim()) { setError('Firm name is required.'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('firms').update({ name: firmName, website_url: websiteUrl || null })
      .eq('owner_id', user.id)

    const { data: firm } = await supabase.from('firms').select('id').eq('owner_id', user.id).single()
    if (firm) {
      // Save everything including scraped service lines so Step 2 always reads fresh DB data.
      // Passing an empty array when nothing was scraped clears any stale data from a previous company.
      await supabase.from('firm_profiles').upsert({
        firm_id: firm.id,
        company_overview: companyOverview,
        core_markets: coreMarkets,
        geographical_focus: geographicalFocus,
        services_description: companyOverview,
        service_lines: scrapedServiceLines,
      }, { onConflict: 'firm_id' })
    }

    // Only keep a minimal session flag so Step 2 can show the "couldn't find service lines" notice.
    sessionStorage.removeItem('venniq_scraped_service_lines')
    sessionStorage.removeItem('venniq_from_firm_step')
    const didScrape = !!websiteUrl && scrapedServiceLines.length === 0 && !!scrapeNote
    if (didScrape) {
      sessionStorage.setItem('venniq_manual_entry_needed', 'true')
    } else {
      sessionStorage.removeItem('venniq_manual_entry_needed')
    }

    router.push('/onboarding/departments-setup')
  }

  return (
    <OnboardingShell step={1} title="Firm Details" subtitle="Tell us about your firm — we'll use this to pre-configure your relevance profile.">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

        {/* Firm name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Firm name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={firmName}
            onChange={e => { setFirmName(e.target.value); setNameMismatchWarning(null); setMismatchAcknowledged(false) }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Turner & Townsend"
          />
        </div>

        {/* Website URL + AI auto-fill */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website URL <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="flex gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://www.yourfirm.com"
            />
            <button
              onClick={scrapeWebsite}
              disabled={scraping || !websiteUrl}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {scraping ? 'Reading…' : 'Auto-fill with AI ✨'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">We'll read your website and extract your company overview, markets, and service lines — you review and edit before saving.</p>
          {scraping && (
            <p className="text-xs text-indigo-600 mt-1 animate-pulse">Reading your website and building your intelligence profile…</p>
          )}

          {/* Name mismatch warning — non-blocking */}
          {nameMismatchWarning && !mismatchAcknowledged && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
              <p className="text-sm text-amber-800">⚠ {nameMismatchWarning}</p>
              <button
                type="button"
                onClick={() => { setNameMismatchWarning(null); setMismatchAcknowledged(true) }}
                className="text-xs font-medium text-amber-700 underline hover:text-amber-900 transition-colors"
              >
                I've confirmed this is the right site — continue
              </button>
            </div>
          )}

          {scrapedServiceLines.length > 0 && (
            <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 space-y-0.5">
              <p className="text-xs text-emerald-700 font-medium">AI extracted {scrapedServiceLines.length} service line{scrapedServiceLines.length !== 1 ? 's' : ''} — review and edit them in the next step.</p>
              {scrapeNote && <p className="text-xs text-emerald-600">{scrapeNote}</p>}
            </div>
          )}
          {!scrapedServiceLines.length && scrapeNote && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-xs text-amber-700">{scrapeNote} You can add your service lines manually in the next step.</p>
            </div>
          )}
        </div>

        {/* Company Overview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Overview</label>
          <textarea
            value={companyOverview}
            onChange={e => setCompanyOverview(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="A 2–3 sentence description of what the firm is, its size, the sectors it operates in, and the types of clients it typically works with."
          />
          <p className="text-xs text-slate-400 mt-1">This is loaded into the AI before every contract matching run.</p>
        </div>

        {/* Core Markets & Sectors */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Core Markets & Sectors</label>
          <p className="text-xs text-slate-500 mb-3">Select the industries and sectors the firm actively pursues work in.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ALL_MARKETS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => toggleMarket(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  coreMarkets.includes(m)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customMarket}
              onChange={e => setCustomMarket(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomMarket() } }}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add a custom market…"
            />
            <button
              type="button"
              onClick={addCustomMarket}
              disabled={!customMarket.trim()}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
          {coreMarkets.filter(m => !ALL_MARKETS.includes(m)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {coreMarkets.filter(m => !ALL_MARKETS.includes(m)).map(m => (
                <span key={m} className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                  {m}
                  <button type="button" onClick={() => toggleMarket(m)} className="hover:text-violet-900">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Geographical Focus */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Geographical Focus</label>
          <textarea
            value={geographicalFocus}
            onChange={e => setGeographicalFocus(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Where the firm operates and actively pursues work — e.g. 'Primarily England and Wales, with offices in London, Manchester, and Birmingham.'"
          />
          <p className="text-xs text-slate-400 mt-1">This influences how the AI scores contract relevance based on location.</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleContinue}
            disabled={saving || !firmName.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    </OnboardingShell>
  )
}
