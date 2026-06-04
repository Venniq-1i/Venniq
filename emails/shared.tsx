import {
  Body, Container, Head, Html, Preview, Section, Text, Hr, Link, Row, Column, Img
} from '@react-email/components'
import type { MatchedDepartment } from '@/types'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://venniq.com'

// Always points to production so logo loads in test and live emails
// (APP_URL resolves to localhost in dev which email clients cannot reach)
const LOGO_URL = 'https://venniq.com/venniq-logo-email.png'

export function fmt(v: number) {
  return v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`
}

export function responseUrl(token: string, status: string) {
  return `${APP_URL}/api/response/${token}?status=${status}`
}

const strengthColours: Record<string, { bg: string; text: string }> = {
  'Very Strong': { bg: '#d1fae5', text: '#065f46' },
  'Strong':      { bg: '#dbeafe', text: '#1e40af' },
  'Moderate':    { bg: '#fef3c7', text: '#92400e' },
  'Weak':        { bg: '#f1f5f9', text: '#475569' },
}

export function CandidateCards({ candidates, issuer, deptName }: { candidates: MatchedDepartment['candidates']; issuer: string; deptName?: string }) {
  if (candidates.length === 0) return null
  return (
    <Section style={{ marginTop: 0 }}>
      {candidates.map((c, i) => {
        const sc = strengthColours[c.relationship_strength] ?? strengthColours['Weak']
        return (
          <Section key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{c.name}</Text>
                {deptName && (
                  <Text style={{ margin: '1px 0 0', fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{deptName}</Text>
                )}
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}>
                  {c.relationship_strength}
                </Text>
              </Column>
            </Row>
            <Text style={{ margin: '4px 0 2px', fontSize: 12, color: '#475569' }}>
              {c.last_employer} · {c.employed_from}–{c.employed_to} · {c.years_since_left === 0 ? 'Currently there' : `Left ${c.years_since_left}yr${c.years_since_left !== 1 ? 's' : ''} ago`}
            </Text>
            <Text style={{ margin: 0, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{c.rationale}</Text>
          </Section>
        )
      })}
    </Section>
  )
}

export function EmailShell({
  preview,
  headerBg,
  headerLabel,
  children,
  appUrl,
}: {
  preview: string
  headerBg: string
  headerLabel: string
  children: React.ReactNode
  appUrl: string
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <Section style={{ background: headerBg, padding: '14px 24px' }}>
            <Row>
              <Column>
                <Img src={LOGO_URL} alt="Venniq" width="110" height="30" style={{ display: 'block' }} />
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                  {headerLabel}
                </Text>
              </Column>
            </Row>
          </Section>
          <Section style={{ padding: '24px 24px 0' }}>
            {children}
          </Section>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0 0' }} />
          <Section style={{ padding: '12px 24px 16px' }}>
            <Row>
              <Column>
                <Img src={LOGO_URL} alt="Venniq" width="70" height="19" style={{ display: 'block', opacity: 0.35 }} />
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                  Sent by Venniq ·{' '}
                  <Link href={`${appUrl}/dashboard`} style={{ color: '#94a3b8' }}>View dashboard</Link>
                </Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
