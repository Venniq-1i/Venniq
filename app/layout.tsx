import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Venniq — AI Opportunity Intelligence',
  description:
    'Venniq is an AI-powered B2B opportunity intelligence platform. It is designed to help organisations analyse their teams\' past employment and project history to identify and unlock cross-divisional revenue and business opportunities — eliminating the revenue leakage caused by organisational silos in professional services firms.',
  keywords: [
    'AI opportunity intelligence',
    'cross-divisional revenue',
    'professional services',
    'revenue leakage',
    'procurement intelligence',
    'B2B opportunity platform',
    'organisational silos',
    'contract intelligence',
  ],
  openGraph: {
    title: 'Venniq — AI Opportunity Intelligence',
    description:
      'An AI-powered B2B platform that analyses your teams\' employment history to identify and unlock cross-divisional revenue opportunities across professional services firms.',
    url: 'https://www.venniq.com',
    siteName: 'Venniq',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Venniq — AI Opportunity Intelligence',
    description:
      'Analyse your teams\' employment history to unlock cross-divisional revenue. The AI platform built for professional services firms.',
  },
  metadataBase: new URL('https://www.venniq.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${spaceGrotesk.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
