import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingIndex() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: firm } = await supabase
    .from('firms')
    .select('onboarding_complete')
    .eq('owner_id', user.id)
    .single()

  if (firm?.onboarding_complete) redirect('/dashboard')

  redirect('/onboarding/firm')
}
