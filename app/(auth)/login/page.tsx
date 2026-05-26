'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CrendoraLogo from '@/components/shared/CrendoraLogo'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(194,212,248,0.2)',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060F2B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <CrendoraLogo size="lg" />
        </div>
        <div style={{ background: '#0D1E4F', border: '0.5px solid rgba(91,155,255,0.18)', borderRadius: '12px', padding: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '4px', letterSpacing: '-0.015em' }}>
            Sign in
          </h1>
          <p style={{ fontSize: '14px', color: '#8BA4CC', fontWeight: 300, marginBottom: '24px' }}>
            Welcome back to Vendroa
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#C2D4F8', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@firm.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#C2D4F8', marginBottom: '6px' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </div>
            {error && (
              <p style={{ fontSize: '13px', color: '#FF5C5C', background: 'rgba(255,92,92,0.1)', border: '0.5px solid rgba(255,92,92,0.25)', borderRadius: '6px', padding: '8px 12px', margin: 0 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#1A6FFF', color: '#ffffff', padding: '10px 22px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '-0.01em' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#8BA4CC', marginTop: '16px', fontWeight: 300 }}>
            No account?{' '}
            <Link href="/signup" style={{ color: '#5B9BFF', fontWeight: 500, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
