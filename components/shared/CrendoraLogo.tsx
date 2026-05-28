interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: '15px', md: '18px', lg: '24px' }

export default function CrendoraLogo({ size = 'md' }: Props) {
  return (
    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: sizes[size], fontWeight: 600, letterSpacing: '-0.02em' }}>
      <span style={{ color: '#ffffff' }}>Venniq</span>
    </span>
  )
}
