import { Section, Text, Row, Column, Link } from '@react-email/components'
import type { Contract } from '@/types'
import { EmailShell, fmt, APP_URL } from './shared'

interface Colleague {
  name: string
  relationship_strength: string
}

interface Props {
  contract: Contract
  employeeName: string
  deptLeadName: string
  deptLeadEmail: string
  matchRationale: string
  relationshipStrength: string
  colleagues: Colleague[]
  intentMode: 'A' | 'B'
}

const strengthColours: Record<string, { bg: string; text: string }> = {
  'Very Strong': { bg: '#d1fae5', text: '#065f46' },
  'Strong':      { bg: '#dbeafe', text: '#1e40af' },
  'Moderate':    { bg: '#fef3c7', text: '#92400e' },
  'Weak':        { bg: '#f1f5f9', text: '#475569' },
}

export default function EmployeeDirectEmail({
  contract,
  employeeName,
  deptLeadName,
  deptLeadEmail,
  matchRationale,
  relationshipStrength,
  colleagues,
  intentMode,
}: Props) {
  const days = contract.deadline
    ? Math.ceil((new Date(contract.deadline).getTime() - Date.now()) / 86400000)
    : null

  const sc = strengthColours[relationshipStrength] ?? strengthColours['Weak']

  return (
    <EmailShell
      preview={`You've been flagged for a ${intentMode === 'A' ? 'sales' : 'bid'} opportunity: ${contract.title}`}
      headerBg="#4f46e5"
      headerLabel="Venniq · You've Been Flagged"
      appUrl={APP_URL}
    >
      <Text style={{ margin: '0 0 4px', fontSize: 14, color: '#475569' }}>Hi {employeeName},</Text>
      <Text style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
        Venniq has identified a <strong>{intentMode === 'A' ? 'sales' : 'bid'} opportunity</strong> linked to your employment history. Your department lead has been alerted and is the decision-maker on next steps.
      </Text>

      {/* Contract summary */}
      <Section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <Text style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{contract.title}</Text>
        <Text style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b' }}>
          {contract.issuer} · <strong style={{ color: '#0f172a' }}>{fmt(contract.value)}</strong>
          {days !== null && (
            <span style={{ color: days <= 14 ? '#dc2626' : '#64748b' }}>
              {' '}· {days > 0 ? `${days} days left` : 'Deadline passed'}
            </span>
          )}
        </Text>
        {contract.description && (
          <Text style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b', lineHeight: '1.5' }}>
            {contract.description.slice(0, 200)}{contract.description.length > 200 ? '…' : ''}
          </Text>
        )}
        {contract.source_url && (
          <Link href={contract.source_url} style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>
            View full opportunity →
          </Link>
        )}
      </Section>

      {/* Why this employee was matched */}
      <Section style={{ background: '#eff6ff', borderLeft: '4px solid #4f46e5', padding: '12px 16px', borderRadius: 4, marginBottom: 20 }}>
        <Row>
          <Column>
            <Text style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Why you were flagged</Text>
          </Column>
          <Column align="right">
            <Text style={{ margin: 0, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}>
              {relationshipStrength} connection
            </Text>
          </Column>
        </Row>
        <Text style={{ margin: 0, fontSize: 13, color: '#3730a3' }}>{matchRationale}</Text>
      </Section>

      {/* Department lead */}
      <Text style={{ margin: '0 0 8px', fontSize: 14, color: '#475569' }}>
        <strong>Your department lead:</strong>{' '}
        <Link href={`mailto:${deptLeadEmail}`} style={{ color: '#4f46e5' }}>{deptLeadName}</Link>
      </Text>

      {/* Colleagues also flagged */}
      {colleagues.length > 0 && (
        <Section style={{ marginBottom: 16 }}>
          <Text style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Also flagged from your firm</Text>
          {colleagues.map((c, i) => {
            const csc = strengthColours[c.relationship_strength] ?? strengthColours['Weak']
            return (
              <Row key={i} style={{ marginBottom: 6 }}>
                <Column>
                  <Text style={{ margin: 0, fontSize: 13, color: '#475569' }}>{c.name}</Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: 0, fontSize: 11, fontWeight: 600, background: csc.bg, color: csc.text, padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}>
                    {c.relationship_strength}
                  </Text>
                </Column>
              </Row>
            )
          })}
        </Section>
      )}

      <Text style={{ margin: '16px 0 0', fontSize: 12, color: '#94a3b8' }}>
        No action is required from you — this is for your awareness only.
      </Text>
    </EmailShell>
  )
}
