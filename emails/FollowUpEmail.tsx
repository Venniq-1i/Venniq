import { Section, Text, Button, Row, Column } from '@react-email/components'
import type { Contract, MatchedDepartment } from '@/types'
import { EmailShell, fmt, responseUrl, APP_URL } from './shared'

interface Props {
  contract: Contract
  deptName: string
  leadName: string
  matchedDept: MatchedDepartment
  responseToken: string
  intentMode: 'A' | 'B'
  daysSinceSent: number
}

export default function FollowUpEmail({
  contract,
  deptName,
  leadName,
  matchedDept,
  responseToken,
  intentMode,
  daysSinceSent,
}: Props) {
  const modeLabel = intentMode === 'A' ? 'Sales Opportunity' : 'Bid Opportunity'
  const headerBg = intentMode === 'A' ? '#b45309' : '#4f46e5'
  const modeTag = intentMode === 'A' ? 'Mode A' : 'Mode B'

  return (
    <EmailShell
      preview={`Follow-up: ${contract.title} — your response is still needed`}
      headerBg={headerBg}
      headerLabel={`Venniq · Follow-Up · ${modeTag}`}
      appUrl={APP_URL}
    >
      <Text style={{ margin: '0 0 4px', fontSize: 14, color: '#475569' }}>Hi {leadName},</Text>
      <Text style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
        This is a follow-up from {daysSinceSent} day{daysSinceSent !== 1 ? 's' : ''} ago. We haven't yet received your response on the{' '}
        <strong>{modeLabel.toLowerCase()}</strong> below. A response keeps the leadership dashboard up to date and helps avoid duplicate outreach.
      </Text>

      <Section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <Text style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{contract.title}</Text>
        <Text style={{ margin: '0 0 2px', fontSize: 13, color: '#64748b' }}>{contract.issuer} · {fmt(contract.value)}</Text>
        <Text style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Department: <strong>{deptName}</strong></Text>
      </Section>

      <Section style={{ background: intentMode === 'A' ? '#fffbeb' : '#eff6ff', borderLeft: `4px solid ${intentMode === 'A' ? '#d97706' : '#4f46e5'}`, padding: '10px 14px', borderRadius: 4, marginBottom: 20 }}>
        <Text style={{ margin: 0, fontSize: 13, color: intentMode === 'A' ? '#78350f' : '#3730a3' }}>{matchedDept.reason}</Text>
      </Section>

      <Section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 8 }}>
        <Text style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Please select a response:</Text>
        <Row>
          <Column style={{ paddingRight: 8 }}>
            <Button
              href={responseUrl(responseToken, 'looking')}
              style={{ background: '#4f46e5', color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center' }}
            >
              Looking Into It
            </Button>
          </Column>
          <Column style={{ paddingRight: 8 }}>
            <Button
              href={responseUrl(responseToken, 'pursuing')}
              style={{ background: '#059669', color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center' }}
            >
              Actively Pursuing
            </Button>
          </Column>
          <Column>
            <Button
              href={responseUrl(responseToken, 'not_relevant')}
              style={{ background: '#6b7280', color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center' }}
            >
              Not Relevant
            </Button>
          </Column>
        </Row>
        <Text style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8' }}>
          One click — no login required. This is the only follow-up you will receive for this opportunity.
        </Text>
      </Section>
    </EmailShell>
  )
}
