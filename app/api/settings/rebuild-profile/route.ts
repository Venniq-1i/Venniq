import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildProfileMarkdown } from '@/lib/relevanceProfile'
import type { FirmProfile, Department } from '@/types'

/**
 * POST /api/settings/rebuild-profile
 *
 * Regenerates profile_markdown from the current firm profile and department data.
 * Call this after saving any company intelligence or department service updates.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 })

  const { data: profileData } = await supabase
    .from('firm_profiles')
    .select('*')
    .eq('firm_id', firm.id)
    .single()

  if (!profileData) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: deptData } = await supabase
    .from('departments')
    .select('*')
    .eq('firm_id', firm.id)

  const profile = profileData as FirmProfile
  const departments = (deptData ?? []) as Department[]

  const newMarkdown = buildProfileMarkdown(firm.name, profile, departments)

  const { error } = await supabase
    .from('firm_profiles')
    .update({ profile_markdown: newMarkdown, updated_at: new Date().toISOString() })
    .eq('firm_id', firm.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
