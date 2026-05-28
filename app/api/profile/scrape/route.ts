import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeServicesFromWebsite } from '@/lib/claude/profileScraper'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const profile = await scrapeServicesFromWebsite(url)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[scrape] error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
}
