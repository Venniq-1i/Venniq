import {
  Body, Container, Head, Html, Preview, Section, Text, Hr, Link, Row, Column, Img, Font
} from '@react-email/components'
import type { MatchedDepartment } from '@/types'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://venniq.com'

// Always points to production so logo loads in test and live emails
// (APP_URL resolves to localhost in dev which email clients cannot reach)
const LOGO_URL = 'https://venniq.com/venniq-logo-email.png'

// Brand palette
export const brand = {
  abyss:   '#060F2B',
  navy:    '#0D1E4F',
  cobalt:  '#0D2A8C',
  royal:   '#1A6FFF',
  sky:     '#5B9BFF',
  mist:    '#C2D4F8',
  frost:   '#EFF4FF',
  success: '#4ACEA6',
  warning: '#F5A623',
}

const FONT_FAMILY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export function fmt(v: number) {
  return v >= 1_000_000 ? `£${(v / 1_000_000).toFixed(1)}m` : `£${(v / 1000).toFixed(0)}k`
}

export function responseUrl(token: string, status: string) {
  return `${APP_URL}/api/response/${token}?status=${status}`
}

const strengthColours: Record<string, { bg: string; text: string }> = {
  'Very Strong': { bg: '#DCFCE7', text: '#14532D' },
  'Strong':      { bg: brand.frost, text: brand.cobalt },
  'Moderate':    { bg: '#FEF9C3', text: '#713F12' },
  'Weak':        { bg: '#F1F5F9', text: '#475569' },
}

export function CandidateCards({ candidates, issuer, deptName }: { candidates: MatchedDepartment['candidates']; issuer: string; deptName?: string }) {
  if (candidates.length === 0) return null
  return (
    <Section style={{ marginTop: 0 }}>
      {candidates.map((c, i) => {
        const sc = strengthColours[c.relationship_strength] ?? strengthColours['Weak']
        return (
          <Section key={i} style={{ background: brand.frost, border: `1px solid ${brand.mist}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontWeight: 700, fontSize: 14, color: brand.navy, fontFamily: FONT_FAMILY }}>{c.name}</Text>
                {deptName && (
                  <Text style={{ margin: '1px 0 0', fontSize: 11, color: brand.royal, fontWeight: 600, fontFamily: FONT_FAMILY }}>{deptName}</Text>
                )}
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 12, display: 'inline-block', fontFamily: FONT_FAMILY }}>
                  {c.relationship_strength}
                </Text>
              </Column>
            </Row>
            <Text style={{ margin: '4px 0 2px', fontSize: 12, color: brand.navy, opacity: 0.7, fontFamily: FONT_FAMILY }}>
              {c.last_employer} · {c.employed_from}–{c.employed_to} · {c.years_since_left === 0 ? 'Currently there' : `Left ${c.years_since_left}yr${c.years_since_left !== 1 ? 's' : ''} ago`}
            </Text>
            <Text style={{ margin: 0, fontSize: 12, color: brand.navy, opacity: 0.6, fontStyle: 'italic', fontFamily: FONT_FAMILY }}>{c.rationale}</Text>
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
      <Head>
        <Font
          fontFamily="Space Grotesk"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozuPTPgY30.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Space Grotesk"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gozuPTPgY30.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: brand.frost, fontFamily: FONT_FAMILY, margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, overflow: 'hidden', border: `1px solid ${brand.mist}` }}>
          <Section style={{ background: headerBg, padding: '14px 24px' }}>
            <Row>
              <Column>
                <Img src={LOGO_URL} alt="Venniq" width="110" style={{ display: 'block' }} />
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: FONT_FAMILY }}>
                  {headerLabel}
                </Text>
              </Column>
            </Row>
          </Section>
          <Section style={{ padding: '24px 24px 0' }}>
            {children}
          </Section>
          <Hr style={{ borderColor: brand.mist, margin: '24px 0 0' }} />
          <Section style={{ padding: '12px 24px 16px' }}>
            <Row>
              <Column>
                <Img src={LOGO_URL} alt="Venniq" width="70" style={{ display: 'block', opacity: 0.35 }} />
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontFamily: FONT_FAMILY }}>
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
