import { Section, Text, Button, Row, Column, Link } from '@react-email/components'
import type { Contract, MatchedDepartment } from '@/types'
import { EmailShell, CandidateCards, fmt, responseUrl, APP_URL } from './shared'

interface CoAlertedDept {
  name: string
  leadName: string
  leadEmail: string
}

interface Props {
  contract: Contract
  deptName: string
  leadName: string
  matchedDept: MatchedDepartment
  responseToken: string
  coAlertedDepts?: CoAlertedDept[]
}

export default function AlertModeBEmail({ contract, deptName, leadName, matchedDept, responseToken, coAlertedDepts = [] }: Props) {
  const days = contract.deadline
    ? Math.ceil((new Date(contract.deadline).getTime() - Date.now()) / 86400000)
    : null

  return (
    <EmailShell
      preview={`Bid opportunity: ${contract.title} · ${fmt(contract.value)}`}
      headerBg="#4f46e5"
      headerLabel="Venniq · Bid Opportunity · Mode B"
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
        Venniq has identified a direct delivery opportunity for your <strong>{deptName}</strong> department{coAlertedDepts.length > 0 ? <> — and the {coAlertedDepts.map(d => d.name).join(' and ')} department{coAlertedDepts.length > 1 ? 's have' : ' has'} also been identified as relevant to this opportunity.</> : '.'}
      </Text>

      {coAlertedDepts.length > 0 && (
        <Section style={{ marginBottom: 20 }}>
          <Text style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Your Co-Alerted Departments</Text>
          <Text style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>
            These teams are receiving the same alert. We encourage you to reach out and coordinate before responding.
          </Text>
          {coAlertedDepts.map(d => (
            <Text key={d.name} style={{ margin: '0 0 4px', fontSize: 13, color: '#475569' }}>
              {d.name} — {d.leadName} (<Link href={`mailto:${d.leadEmail}`} style={{ color: '#4f46e5' }}>{d.leadEmail}</Link>)
            </Text>
          ))}
        </Section>
      )}

      <Section style={{ background: '#eff6ff', borderLeft: '4px solid #4f46e5', padding: '12px 16px', borderRadius: 4, marginBottom: 20 }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e40af' }}>{matchedDept.capability_match}</Text>
        <Text style={{ margin: '4px 0 0', fontSize: 13, color: '#3730a3' }}>{matchedDept.reason}</Text>
      </Section>

      {matchedDept.candidates.length > 0 && (
        <>
          <Text style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Recommended bid team candidates</Text>
          <Text style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
            These colleagues have a prior relationship with {contract.issuer}:
          </Text>
          <CandidateCards candidates={matchedDept.candidates} issuer={contract.issuer} deptName={deptName} />
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
