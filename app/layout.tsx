import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Venniq — AI Opportunity Intelligence',
  description: "Turn your team's employment history into cross-divisional revenue.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
