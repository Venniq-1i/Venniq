import { Section, Text, Row, Column, Link } from '@react-email/components'
import type { Contract } from '@/types'
import { EmailShell, fmt, APP_URL } from './shared'

interface Props {
  contract: Contract
  deptName: string
  leadName: string
  leadEmail: string
  intentMode: 'A' | 'B'
  dashboardUrl: string
}

export default function PursuingLeadershipEmail({
  contract,
  deptName,
  leadName,
  leadEmail,
  intentMode,
  dashboardUrl,
}: Props) {
  const modeLabel = intentMode === 'A' ? 'Sales Opportunity' : 'Bid Opportunity'

  return (
    <EmailShell
      preview={`${deptName} is actively pursuing: ${contract.title}`}
      headerBg="#059669"
      headerLabel="Venniq · Actively Pursuing"
      appUrl={APP_URL}
    >
      <Text style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
        A department head has marked a {modeLabel.toLowerCase()} as <strong>Actively Pursuing</strong>.
      </Text>

      <Section style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
        <Row style={{ marginBottom: 10 }}>
          <Column>
            <Text style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Opportunity</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{contract.title}</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{contract.issuer} · {fmt(contract.value)}</Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Department</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 14, color: '#0f172a' }}>{deptName}</Text>
          </Column>
          <Column>
            <Text style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Lead</Text>
            <Text style={{ margin: '2px 0 0', fontSize: 14, color: '#0f172a' }}>
              {leadName} · <Link href={`mailto:${leadEmail}`} style={{ color: '#4f46e5' }}>{leadEmail}</Link>
            </Text>
          </Column>
        </Row>
      </Section>

      <Text style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
        No further automated follow-up emails will be sent for this opportunity. You can track progress on the{' '}
        <Link href={dashboardUrl} style={{ color: '#4f46e5', fontWeight: 600 }}>leadership dashboard</Link>.
      </Text>
    </EmailShell>
  )
}
