import Image from 'next/image'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  /** 'dark' = for dark nav/backgrounds; 'light' = for light backgrounds (no pill wrapper) */
  variant?: 'dark' | 'light'
}

const heights = { sm: 18, md: 30, lg: 38 }

export default function CrendoraLogo({ size = 'md', variant = 'dark' }: Props) {
  const h = heights[size]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: variant === 'dark' ? '#ffffff' : 'transparent',
      borderRadius: variant === 'dark' ? '8px' : '0',
      padding: variant === 'dark' ? '5px 10px' : '0',
    }}>
      <Image
        src="/venniq-logo-hd.png"
        alt="Venniq"
        width={120}
        height={h}
        priority
        style={{
          height: h,
          width: 'auto',
          display: 'block',
        }}
      />
    </span>
  )
}
