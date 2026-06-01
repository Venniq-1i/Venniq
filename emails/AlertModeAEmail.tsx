import { Section, Text, Button, Row, Column, Link } from '@react-email/components'
import type { Contract, MatchedDepartment } from '@/types'
import { EmailShell, CandidateCards, fmt, responseUrl, APP_URL } from './shared'

interface Props {
  contract: Contract
  deptName: string
  leadName: string
  matchedDept: MatchedDepartment
  responseToken: string
  advisoryAnalysis?: string
}

export default function AlertModeAEmail({ contract, deptName, leadName, matchedDept, responseToken, advisoryAnalysis }: Props) {
  const days = contract.deadline
    ? Math.ceil((new Date(contract.deadline).getTime() - Date.now()) / 86400000)
    : null

  return (
    <EmailShell
      preview={`Sales opportunity: ${contract.title} · ${fmt(contract.value)}`}
      headerBg="#b45309"
      headerLabel="Venniq · Sales Opportunity · Mode A"
      appUrl={APP_URL}
    >
      <Row>
        <Column>
          <Text style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{contract.title}</Text>
          <Text style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            {contract.issuer} · <strong style={{ color: '#0f172a' }}>{fmt(contract.value)}</strong>
            {days !== null && (
              <span style={{ color: days <= 14 ? '#dc2626' : '#64748b' }}>
                {' '}· {days > 0 ? `${days} days left` : 'Deadline passed'}
              </span>
            )}
          </Text>
        </Column>
      </Row>

      {contract.description && (
        <Text style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: '1.5' }}>
          {contract.description.slice(0, 300)}{contract.description.length > 300 ? '…' : ''}
        </Text>
      )}

      {contract.source_url && (
        <Section style={{ marginBottom: 20 }}>
          <Link href={contract.source_url} style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600 }}>
            View full opportunity →
          </Link>
        </Section>
      )}

      <Text style={{ margin: '0 0 4px', fontSize: 14, color: '#475569' }}>Hi {leadName},</Text>
      <Text style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
        Venniq has identified a sales opportunity for your <strong>{deptName}</strong> department. The winner or serious bidder on this contract will likely need consultancy or specialist support — and your team has prior relationships there.
      </Text>

      {advisoryAnalysis && (
        <Section style={{ background: '#fef3c7', borderLeft: '4px solid #d97706', padding: '12px 16px', borderRadius: 4, marginBottom: 16 }}>
          <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>Advisory Opportunity Analysis</Text>
          <Text style={{ margin: '4px 0 0', fontSize: 13, color: '#78350f', lineHeight: '1.5' }}>{advisoryAnalysis}</Text>
        </Section>
      )}

      <Section style={{ background: '#fffbeb', borderLeft: '4px solid #d97706', padding: '12px 16px', borderRadius: 4, marginBottom: 20 }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>Why this is a sales opportunity</Text>
        <Text style={{ margin: '4px 0 0', fontSize: 13, color: '#78350f' }}>{matchedDept.reason}</Text>
      </Section>

      {matchedDept.candidates.length > 0 && (
        <>
          <Text style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Relationship candidates for outreach</Text>
          <Text style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
            These colleagues previously worked at {contract.issuer}:
          </Text>
          <CandidateCards candidates={matchedDept.candidates} issuer={contract.issuer} />
        </>
      )}

      <Section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginTop: 24, marginBottom: 8 }}>
        <Text style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          How would you like to respond?
        </Text>
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
          One click — no login required. Your response updates the leadership dashboard instantly.
        </Text>
      </Section>
    </EmailShell>
  )
}
