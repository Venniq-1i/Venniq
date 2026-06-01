'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/settings',              label: 'Intelligence' },
  { href: '/settings/subscription', label: 'Subscription & Alerts' },
  { href: '/settings/departments',  label: 'Departments' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px 0' }}>
      {/* Tab nav */}
      <nav style={{ display: 'flex', gap: '4px', marginBottom: '32px', borderBottom: '0.5px solid #D8E4FF', paddingBottom: '0' }}>
        {TABS.map(tab => {
          const isActive = tab.href === '/settings'
            ? pathname === '/settings'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 14px',
                borderRadius: '6px 6px 0 0',
                textDecoration: 'none',
                color: isActive ? '#0D1E4F' : '#8BA4CC',
                background: isActive ? '#ffffff' : 'transparent',
                borderBottom: isActive ? '2px solid #1A6FFF' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
