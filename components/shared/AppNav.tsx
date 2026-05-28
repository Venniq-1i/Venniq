'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CrendoraLogo from './CrendoraLogo'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
]

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isOnboarding = pathname.startsWith('/onboarding')

  return (
    <header style={{
      background: '#060F2B',
      borderBottom: '0.5px solid rgba(91,155,255,0.15)',
      height: '48px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <CrendoraLogo size="md" />
          </Link>
          {!isOnboarding && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {NAV_LINKS.map(link => {
                const isActive = pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      color: isActive ? '#ffffff' : '#8BA4CC',
                      background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: '5px',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
        <button
          onClick={handleSignOut}
          style={{ color: '#8BA4CC', fontSize: '12px', fontWeight: 400, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
