'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import CrendoraLogo from './CrendoraLogo'

const NAV_LINKS = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/contracts',     label: 'Opportunities' },
  { href: '/team-activity', label: 'Team Activity' },
  { href: '/settings',      label: 'Settings' },
]

interface AppNavProps {
  alertsPaused?: boolean
  userEmail?: string
  userAvatarUrl?: string | null
}

function getInitials(email?: string): string {
  if (!email) return '?'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export default function AppNav({ alertsPaused, userEmail, userAvatarUrl }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isOnboarding = pathname.startsWith('/onboarding')
  const initials = getInitials(userEmail)

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
                const isActive = link.href === '/settings'
                  ? pathname.startsWith('/settings')
                  : pathname.startsWith(link.href)
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {alertsPaused && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: '100px',
              background: 'rgba(251,191,36,0.12)',
              color: '#FBBF24',
              border: '0.5px solid rgba(251,191,36,0.3)',
              letterSpacing: '0.01em',
            }}>
              Alerts paused
            </span>
          )}

          {/* Avatar with dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: userAvatarUrl ? 'transparent' : '#1A3A7A',
                border: '1.5px solid rgba(91,155,255,0.3)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label="User menu"
            >
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#8BA4CC', lineHeight: 1 }}>{initials}</span>
              )}
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '36px',
                right: 0,
                background: '#0D1E4F',
                border: '0.5px solid rgba(91,155,255,0.2)',
                borderRadius: '8px',
                minWidth: '160px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                zIndex: 50,
              }}>
                {userEmail && (
                  <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(91,155,255,0.15)' }}>
                    <p style={{ fontSize: '11px', color: '#8BA4CC', margin: 0, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    color: '#8BA4CC',
                    fontWeight: 400,
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
