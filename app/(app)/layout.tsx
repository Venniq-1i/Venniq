import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/components/shared/AppNav'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: existingFirm } = await supabase
    .from('firms')
    .select('id, onboarding_complete')
    .eq('owner_id', user.id)
    .single()

  if (!existingFirm) {
    const firmName = (user.user_metadata?.firm_name as string | undefined) ?? 'My Firm'
    await supabase
      .from('firms')
      .insert({ owner_id: user.id, name: firmName, onboarding_complete: false })
  }

  let alertsPaused = false
  if (existingFirm) {
    const { data: profile } = await supabase
      .from('firm_profiles')
      .select('alerts_paused')
      .eq('firm_id', existingFirm.id)
      .single()
    alertsPaused = profile?.alerts_paused ?? false
  }

  const userEmail = user.email ?? undefined
  const userAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FF' }}>
      <AppNav alertsPaused={alertsPaused} userEmail={userEmail} userAvatarUrl={userAvatarUrl} />
      <main>{children}</main>
    </div>
  )
}
