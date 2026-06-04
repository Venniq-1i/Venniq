import { Section, Text, Button, Row, Column, Link } from '@react-email/components'
import type { Contract, MatchedDepartment } from '@/types'
import { EmailShell, CandidateCards, fmt, responseUrl, APP_URL, brand } from './shared'

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
  advisoryAnalysis?: string
  coAlertedDepts?: CoAlertedDept[]
}

const F = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export default function AlertModeAEmail({ contract, deptName, leadName, matchedDept, responseToken, advisoryAnalysis, coAlertedDepts = [] }: Props) {
  const days = contract.deadline
    ? Math.ceil((new Date(contract.deadline).getTime() - Date.now()) / 86400000)
    : null

  return (
    <EmailShell
      preview={`Consultancy & advisory sales opportunity: ${contract.title} · ${fmt(contract.value)}`}
      headerBg={brand.cobalt}
      headerLabel="Venniq · Consultancy & Advisory Sales Opportunity · Mode A"
      appUrl={APP_URL}
    >
      <Row>
        <Column>
          <Text style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: brand.navy, fontFamily: F }}>{contract.title}</Text>
          <Text style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', fontFamily: F }}>
            {contract.issuer} · <strong style={{ color: brand.navy }}>{fmt(contract.value)}</strong>
            {days !== null && (
              <span style={{ color: days <= 14 ? '#dc2626' : '#64748b' }}>
                {' '}· {days > 0 ? `${days} days left` : 'Deadline passed'}
              </span>
            )}
          </Text>
        </Column>
      </Row>

      {contract.description && (
        <Text style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: '1.6', fontFamily: F }}>
          {contract.description.slice(0, 300)}{contract.description.length > 300 ? '…' : ''}
        </Text>
      )}

      {contract.source_url && (
        <Section style={{ marginBottom: 20 }}>
          <Link href={contract.source_url} style={{ fontSize: 13, color: brand.royal, fontWeight: 600, fontFamily: F }}>
            View full opportunity →
          </Link>
        </Section>
      )}

      <Text style={{ margin: '0 0 4px', fontSize: 14, color: brand.navy, fontFamily: F }}>Hi {leadName},</Text>
      <Text style={{ margin: '0 0 16px', fontSize: 14, color: brand.navy, lineHeight: '1.6', fontFamily: F }}>
        Venniq has identified a consultancy and advisory sales opportunity for your <strong>{deptName}</strong> department{coAlertedDepts.length > 0 ? <> — and the {coAlertedDepts.map(d => d.name).join(' and ')} department{coAlertedDepts.length > 1 ? 's have' : ' has'} also been identified as relevant to this opportunity.</> : '.'}
      </Text>

      {coAlertedDepts.length > 0 && (
        <Section style={{ background: brand.frost, border: `1px solid ${brand.mist}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <Text style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: brand.navy, fontFamily: F }}>Your Co-Alerted Departments</Text>
          <Text style={{ margin: '0 0 10px', fontSize: 13, color: brand.navy, fontFamily: F }}>
            These teams are receiving the same alert. We encourage you to reach out and coordinate before responding.
          </Text>
          {coAlertedDepts.map(d => (
            <Text key={d.name} style={{ margin: '0 0 4px', fontSize: 13, color: brand.navy, fontFamily: F }}>
              {d.name} — {d.leadName} (<Link href={`mailto:${d.leadEmail}`} style={{ color: brand.royal }}>{d.leadEmail}</Link>)
            </Text>
          ))}
        </Section>
      )}

      {advisoryAnalysis && (
        <Section style={{ background: brand.frost, borderLeft: `4px solid ${brand.cobalt}`, padding: '12px 16px', borderRadius: 4, marginBottom: 16 }}>
          <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: brand.cobalt, fontFamily: F }}>Advisory Opportunity Analysis</Text>
          <Text style={{ margin: '4px 0 0', fontSize: 13, color: brand.navy, lineHeight: '1.6', fontFamily: F }}>{advisoryAnalysis}</Text>
        </Section>
      )}

      <Section style={{ background: brand.frost, borderLeft: `4px solid ${brand.royal}`, padding: '12px 16px', borderRadius: 4, marginBottom: 20 }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: brand.cobalt, fontFamily: F }}>Why this is a sales opportunity</Text>
        <Text style={{ margin: '4px 0 0', fontSize: 13, color: brand.navy, lineHeight: '1.6', fontFamily: F }}>{matchedDept.reason}</Text>
      </Section>

      {matchedDept.candidates.length > 0 && (
        <>
          <Text style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: brand.navy, fontFamily: F }}>Relationship candidates for outreach</Text>
          <Text style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b', fontFamily: F }}>
            These colleagues previously worked at {contract.issuer}:
          </Text>
          <CandidateCards candidates={matchedDept.candidates} issuer={contract.issuer} deptName={deptName} />
        </>
      )}

      <Section style={{ background: brand.frost, border: `1px solid ${brand.mist}`, borderRadius: 10, padding: '16px 20px', marginTop: 24, marginBottom: 8 }}>
        <Text style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: brand.navy, fontFamily: F }}>
          How would you like to respond?
        </Text>
        <Row>
          <Column style={{ paddingRight: 8 }}>
            <Button
              href={responseUrl(responseToken, 'looking')}
              style={{ background: brand.cobalt, color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center', fontFamily: F }}
            >
              Looking Into It
            </Button>
          </Column>
          <Column style={{ paddingRight: 8 }}>
            <Button
              href={responseUrl(responseToken, 'pursuing')}
              style={{ background: brand.success, color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center', fontFamily: F }}
            >
              Actively Pursuing
            </Button>
          </Column>
          <Column>
            <Button
              href={responseUrl(responseToken, 'not_relevant')}
              style={{ background: '#6b7280', color: '#fff', padding: '10px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'block', textAlign: 'center', fontFamily: F }}
            >
              Not Relevant
            </Button>
          </Column>
        </Row>
        <Text style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: F }}>
          One click — no login required. Your response updates the leadership dashboard instantly.
        </Text>
      </Section>
    </EmailShell>
  )
}
