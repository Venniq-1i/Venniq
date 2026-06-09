'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

const navy = '#0D1E4F'
const cobalt = '#0D2A8C'
const royal = '#1A6FFF'
const sky = '#5B9BFF'
const frost = '#EFF4FF'
const mist = '#C2D4F8'
const abyss = '#060F2B'

// ─────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="nav-inner" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 32px',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(6,15,43,0.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(194,212,248,0.12)' : 'none',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <Image
        src="/venniq-logo.png"
        alt="Venniq"
        width={120}
        height={36}
        style={{ objectFit: 'contain', background: '#ffffff', borderRadius: '8px', padding: '4px 10px' }}
        priority
      />
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/login" style={{
          fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)',
          textDecoration: 'none', padding: '8px 16px',
          transition: 'color 0.2s',
        }}>
          Sign in
        </Link>
        <a href="#early-access" style={{
          fontSize: '13px', fontWeight: 500, color: '#ffffff',
          background: royal, padding: '8px 20px', borderRadius: '6px',
          textDecoration: 'none', transition: 'background 0.2s',
        }}>
          Request Access
        </a>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      background: `linear-gradient(160deg, ${abyss} 0%, ${navy} 55%, ${cobalt} 100%)`,
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '120px 24px 100px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(91,155,255,0.08) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: '20%', right: '10%',
        width: '600px', height: '600px',
        background: `radial-gradient(circle, rgba(26,111,255,0.15) 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(26,111,255,0.15)', border: '1px solid rgba(26,111,255,0.3)',
          borderRadius: '100px', padding: '6px 16px', marginBottom: '36px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sky, display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: sky, letterSpacing: '0.08em' }}>
            AI Opportunity Intelligence · Professional Services
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(42px, 7vw, 80px)',
          fontWeight: 600, color: '#ffffff',
          lineHeight: 1.05, margin: '0 0 28px',
          letterSpacing: '-0.03em',
        }}>
          Find every opportunity.<br />
          Alert every team.<br />
          <em style={{ color: sky, fontStyle: 'normal' }}>Win as one firm.</em>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.65)', lineHeight: 1.7,
          maxWidth: '640px', margin: '0 auto 48px',
        }}>
          The intelligence layer between your contract sources and your teams.
          Venniq identifies every department that can deliver, surfaces who already knows the client,
          and alerts everyone simultaneously — straight to their inbox.
          No new tools. No behaviour change.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="#early-access" style={{
            padding: '14px 32px', background: royal, color: '#ffffff',
            borderRadius: '8px', fontSize: '15px', fontWeight: 500,
            textDecoration: 'none', letterSpacing: '-0.01em',
            boxShadow: `0 0 40px rgba(26,111,255,0.4)`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            Request Early Access →
          </a>
          <a href="#how-it-works" style={{
            padding: '14px 24px', color: 'rgba(255,255,255,0.6)',
            fontSize: '14px', fontWeight: 400, textDecoration: 'none',
            transition: 'color 0.2s',
          }}>
            See how it works ↓
          </a>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Stat Banner
// ─────────────────────────────────────────────
function StatBanner() {
  return (
    <div style={{
      background: abyss,
      padding: '32px 24px',
      borderBottom: `1px solid rgba(194,212,248,0.1)`,
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0,
        }}>
          In a 500-person professional services firm, the average contract opportunity touches{' '}
          <strong style={{ color: '#ffffff', fontWeight: 600 }}>3 departments</strong>.
          {' '}Most firms action it with{' '}
          <strong style={{ color: sky, fontWeight: 600 }}>one</strong>.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Research / Stats
// ─────────────────────────────────────────────
function ResearchSection() {
  const { ref, inView } = useInView(0.1)

  const stats = [
    {
      figure: '70%',
      label: 'of executives identify silo mentality as the single biggest obstacle to organisational effectiveness',
      source: 'Harvard Business Review 2025',
      sourceUrl: 'https://hbr.org/2025/03/3-types-of-silos-that-stifle-collaboration-and-how-to-dismantle-them',
    },
    {
      figure: '67%',
      label: 'of collaboration failures inside organisations are directly caused by departmental silos',
      source: 'Harvard Business Review 2025',
      sourceUrl: 'https://hbr.org/2025/03/3-types-of-silos-that-stifle-collaboration-and-how-to-dismantle-them',
    },
    {
      figure: '44%',
      label: 'of professional services firms missed revenue targets — internal inefficiencies cited as the primary cause',
      source: 'Dayshape 2025',
      sourceUrl: 'https://www.consultancy.uk/news/42265/four-in-ten-professional-services-firms-missed-revenue-targets',
    },
    {
      figure: '20–30%',
      label: 'of annual revenue lost to internal inefficiencies every year',
      source: 'McKinsey 2023',
      sourceUrl: 'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/the-state-of-organizations-2023',
    },
  ]

  return (
    <section style={{ background: abyss, padding: '96px 24px' }} ref={ref}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: sky, marginBottom: '12px',
          }}>
            The research
          </span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 600,
            color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            This isn't a new problem.<br />It just hasn't had a solution.
          </h2>
          <p style={{
            fontSize: '16px', fontWeight: 300,
            color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: '520px',
            marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7,
          }}>
            Decades of research confirm what every firm already knows but hasn't been able to fix.
          </p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2px',
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(194,212,248,0.08)',
              borderRadius: i === 0 ? '16px 0 0 16px' : i === stats.length - 1 ? '0 16px 16px 0' : '0',
              padding: '40px 32px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(24px)',
              transition: `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`,
            }}>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 600,
                color: sky, margin: '0 0 14px', lineHeight: 1,
                letterSpacing: '-0.03em',
              }}>
                {stat.figure}
              </p>
              <p style={{
                fontSize: '14px', fontWeight: 300,
                color: 'rgba(255,255,255,0.7)', margin: '0 0 20px',
                lineHeight: 1.65,
              }}>
                {stat.label}
              </p>
              <a href={stat.sourceUrl} target="_blank" rel="noopener noreferrer" style={{
                fontSize: '11px', fontWeight: 500,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '12px', display: 'block',
                textDecoration: 'none',
              }}>
                {stat.source}
              </a>
            </div>
          ))}
        </div>

        {/* Pull-out quote */}
        <div style={{
          marginTop: '48px',
          padding: '32px 40px',
          background: `rgba(26,111,255,0.08)`,
          border: `1px solid rgba(26,111,255,0.2)`,
          borderRadius: '16px',
          textAlign: 'center',
          opacity: inView ? 1 : 0,
          transition: 'opacity 0.7s ease 500ms',
        }}>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 300,
            color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.75,
            maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            McKinsey estimates that firms which successfully execute cross-divisional collaboration
            generate{' '}
            <strong style={{ color: '#ffffff', fontWeight: 500 }}>up to 30% more revenue</strong>
            {' '}than those that don't.
            The gap isn't capability — it's <em style={{ color: sky, fontStyle: 'normal' }}>connection</em>.
          </p>
        </div>

      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────
function ProblemSection() {
  const { ref, inView } = useInView()

  const cards = [
    {
      icon: '◆',
      title: 'Found by one team. Won by one team.',
      body: 'The best opportunities are spotted by whoever happens to see them first. The rest of the firm never finds out — not because they wouldn\'t have contributed, but because no mechanism existed to tell them.',
    },
    {
      icon: '◆',
      title: 'The connection that never happened.',
      body: 'Revenue isn\'t lost because the opportunity didn\'t exist. It\'s lost because no one connected the dots between departments. The silos aren\'t intentional — they\'re structural.',
    },
    {
      icon: '◆',
      title: 'By the time collaboration starts, the window has closed.',
      body: 'Internal alignment takes days. Emails get forwarded. Meetings get scheduled. And the deadline doesn\'t wait. Firms lose not from lack of capability — but from lack of speed.',
    },
  ]

  return (
    <section style={{ background: '#ffffff', padding: '100px 24px' }} ref={ref}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: royal, marginBottom: '12px',
          }}>
            The problem
          </span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600,
            color: navy, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Where the revenue goes
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {cards.map((card, i) => (
            <div key={i} style={{
              border: `1px solid ${mist}`,
              borderRadius: '16px', padding: '36px 32px',
              background: frost,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(28px)',
              transition: `opacity 0.6s ease ${i * 150}ms, transform 0.6s ease ${i * 150}ms`,
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${royal}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px', fontSize: '14px', color: royal,
              }}>
                {card.icon}
              </div>
              <h3 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '18px', fontWeight: 600, color: navy,
                margin: '0 0 12px', lineHeight: 1.25,
              }}>
                {card.title}
              </h3>
              <p style={{
                fontSize: '14px', color: '#536180', lineHeight: 1.7,
                margin: 0, fontWeight: 300,
              }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// What Venniq Is / Isn't
// ─────────────────────────────────────────────
function WhatItIsSection() {
  const { ref, inView } = useInView()

  const rows = [
    {
      not: 'Another contract finder',
      is: 'An intelligence layer on top of every source you already use — or choose to connect',
    },
    {
      not: 'A collaboration tool that asks people to change how they work',
      is: 'A mechanism that makes collaboration happen automatically, inside your existing email workflow',
    },
    {
      not: 'A system that alerts one team and hopes the message gets passed on',
      is: 'Simultaneous, personalised alerts to every relevant department at the exact same moment',
    },
    {
      not: 'A tool that surfaces an opportunity and leaves you to figure out the approach',
      is: 'An alert that already names the colleague in your team with a prior relationship to the client',
    },
  ]

  return (
    <section style={{ background: navy, padding: '100px 24px' }} ref={ref}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: sky, marginBottom: '12px',
          }}>
            What Venniq is
          </span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600,
            color: '#ffffff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Not a finder. Not a CRM.<br />
            <span style={{ color: sky }}>Something that didn't exist before.</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {rows.map((row, i) => (
            <div key={i} className="what-it-is-row" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
            }}>
              {/* Not */}
              <div className="what-it-is-cell-not" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: i === 0 ? '12px 12px 0 0' : i === rows.length - 1 ? '0 0 0 12px' : '0',
                padding: '22px 28px',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}>
                <span style={{
                  fontSize: '16px', color: 'rgba(255,255,255,0.2)',
                  flexShrink: 0, marginTop: '1px',
                }}>✕</span>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
                  {row.not}
                </p>
              </div>
              {/* Is */}
              <div className="what-it-is-cell-is" style={{
                background: `${royal}18`,
                border: `1px solid ${royal}30`,
                borderRadius: i === 0 ? '0 12px 0 0' : i === rows.length - 1 ? '0 0 12px 0' : '0',
                padding: '22px 28px',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}>
                <span style={{
                  fontSize: '16px', color: royal,
                  flexShrink: 0, marginTop: '1px',
                }}>✓</span>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
                  {row.is}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// How It Works (animated timeline)
// ─────────────────────────────────────────────
function HowItWorksSection() {
  const { ref, inView } = useInView(0.1)
  const lineRef = useRef<HTMLDivElement>(null)

  const steps = [
    {
      number: '01',
      title: 'Intelligence That Never Sleeps',
      body: 'Venniq monitors every contract published across your connected sources — government portals, procurement platforms, industry feeds — processing thousands of notices continuously. Your team doesn\'t need to look. We do the looking.',
      tag: 'Continuous monitoring',
    },
    {
      number: '02',
      title: 'Your Firm\'s Full Capability, Applied to Every Opportunity',
      body: 'Our AI maps each contract against your complete organisational profile — every department, every service line, every sector your teams cover. Not just the first obvious match. Every match. Including the ones no single department would have spotted alone.',
      tag: 'AI matching',
    },
    {
      number: '03',
      title: 'The Alert That Changes Everything',
      body: 'The moment a match is confirmed, every relevant department receives a personalised alert — simultaneously. Not a chain email. Not a forwarded notice. A targeted message that names the colleague in their team who already has a prior relationship with that client. The opportunity arrives ready to act on.',
      tag: 'Simultaneous alerts',
    },
  ]

  return (
    <section id="how-it-works" style={{ background: '#F8FAFF', padding: '100px 24px' }} ref={ref}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: royal, marginBottom: '12px',
          }}>
            How it works
          </span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600,
            color: navy, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            From contract published<br />to team alerted — in minutes.
          </h2>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Vertical track */}
          <div className="how-it-works-track" style={{
            position: 'absolute',
            left: '31px',
            top: '32px',
            bottom: '32px',
            width: '2px',
            background: mist,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div ref={lineRef} style={{
              width: '100%',
              background: `linear-gradient(180deg, ${royal}, ${sky})`,
              height: inView ? '100%' : '0%',
              transition: 'height 1.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          {steps.map((step, i) => (
            <div key={i} className="how-it-works-step" style={{
              display: 'flex',
              gap: '36px',
              marginBottom: i < steps.length - 1 ? '64px' : '0',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-16px)',
              transition: `opacity 0.6s ease ${300 + i * 350}ms, transform 0.6s ease ${300 + i * 350}ms`,
            }}>
              {/* Circle */}
              <div className="how-it-works-step-circle" style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: inView ? royal : mist,
                border: `3px solid ${inView ? royal : mist}`,
                boxShadow: inView ? `0 0 24px ${royal}50` : 'none',
                transition: `background 0.4s ease ${500 + i * 350}ms, box-shadow 0.4s ease ${500 + i * 350}ms`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px', fontWeight: 600, color: '#ffffff',
                position: 'relative', zIndex: 1,
              }}>
                {step.number}
              </div>

              {/* Content card */}
              <div style={{
                flex: 1,
                background: '#ffffff',
                border: `1px solid ${mist}`,
                borderRadius: '16px',
                padding: '28px 32px',
                marginTop: '8px',
                boxShadow: '0 2px 16px rgba(13,30,79,0.06)',
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 500,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: royal, background: frost,
                    padding: '3px 10px', borderRadius: '100px',
                  }}>
                    {step.tag}
                  </span>
                </div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '20px', fontWeight: 600, color: navy,
                  margin: '0 0 12px', lineHeight: 1.25,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '15px', color: '#536180', lineHeight: 1.75,
                  margin: 0, fontWeight: 300,
                }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Differentiator / Quote
// ─────────────────────────────────────────────
function DifferentiatorSection() {
  const { ref, inView } = useInView()

  const points = [
    {
      title: 'Simultaneous cross-departmental alerting',
      body: 'Every relevant team hears about an opportunity at the same moment — not through a chain of forwarded emails or someone\'s initiative. The structural barrier to collaboration is removed before it can form.',
    },
    {
      title: 'Employment history as warm contact intelligence',
      body: 'The alert doesn\'t just say "your department should bid." It names the specific colleague in that team who worked at the client\'s organisation. A cold tender becomes a warm conversation.',
    },
    {
      title: 'Zero behaviour change required',
      body: 'Venniq works entirely through email — the tool every team already uses. There is no platform to log into, no dashboard to check. The intelligence comes to you, personalised, at the right moment.',
    },
    {
      title: 'Your full capability, visible as one',
      body: 'Most firms bid as one department. Venniq enables the whole firm to show up. Cross-divisional wins aren\'t the result of better communication — they\'re the result of every team knowing the same thing, simultaneously.',
    },
  ]

  return (
    <section style={{ background: '#ffffff', padding: '100px 24px' }} ref={ref}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Pull quote */}
        <div style={{
          textAlign: 'center', marginBottom: '80px',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          <div style={{
            width: '48px', height: '3px',
            background: `linear-gradient(90deg, ${royal}, ${sky})`,
            borderRadius: '2px', margin: '0 auto 32px',
          }} />
          <blockquote style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 500,
            color: navy, margin: 0, lineHeight: 1.35, letterSpacing: '-0.02em',
            maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            "We're not demanding collaboration.<br />
            We're just connecting the dots —<br />
            <span style={{ color: royal }}>and letting the opportunity do the rest."</span>
          </blockquote>
        </div>

        {/* 4 points grid */}
        <div className="differentiator-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
          {points.map((point, i) => (
            <div key={i} style={{
              display: 'flex', gap: '20px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${200 + i * 100}ms, transform 0.5s ease ${200 + i * 100}ms`,
            }}>
              <div style={{
                width: '4px', borderRadius: '4px',
                background: `linear-gradient(180deg, ${royal}, ${sky})`,
                flexShrink: 0, marginTop: '4px',
              }} />
              <div>
                <h4 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '16px', fontWeight: 600, color: navy,
                  margin: '0 0 8px',
                }}>
                  {point.title}
                </h4>
                <p style={{
                  fontSize: '14px', color: '#536180',
                  lineHeight: 1.7, margin: 0, fontWeight: 300,
                }}>
                  {point.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Who It's For
// ─────────────────────────────────────────────
function WhoSection() {
  const { ref, inView } = useInView()

  const firms = [
    {
      label: 'Management Consultancies',
      desc: 'Multiple practice areas, one firm. Venniq ensures every practice knows about every opportunity — and that the client relationship already inside the firm is used.',
    },
    {
      label: 'Law Firms',
      desc: 'Disputes, corporate, real estate, employment — each department sees the world through its own lens. Venniq gives each one visibility of the whole picture.',
    },
    {
      label: 'Accountancy & Advisory',
      desc: 'Tax, audit, transactions, restructuring. The firms that win the most don\'t just advise — they bring the right combination of expertise. Venniq makes that combination visible.',
    },
    {
      label: 'Any multi-location professional services firm',
      desc: 'When teams are spread across offices, cities, or regions, structural silos form by default. Venniq dissolves them — without asking anyone to change how they work.',
    },
  ]

  return (
    <section style={{ background: frost, padding: '100px 24px' }} ref={ref}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: royal, marginBottom: '12px',
          }}>
            Built for
          </span>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600,
            color: navy, margin: 0, letterSpacing: '-0.02em',
          }}>
            Firms where the left hand<br />doesn't always know what the right hand can do
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {firms.map((firm, i) => (
            <div key={i} style={{
              background: '#ffffff', border: `1px solid ${mist}`,
              borderRadius: '14px', padding: '28px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
            }}>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px', fontWeight: 600, color: navy,
                margin: '0 0 10px',
              }}>
                {firm.label}
              </p>
              <p style={{
                fontSize: '13px', color: '#536180',
                lineHeight: 1.7, margin: 0, fontWeight: 300,
              }}>
                {firm.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Vision
// ─────────────────────────────────────────────
function VisionSection() {
  const { ref, inView } = useInView()

  return (
    <section style={{ background: navy, padding: '80px 24px' }} ref={ref}>
      <div style={{
        maxWidth: '700px', margin: '0 auto', textAlign: 'center',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}>
        <span style={{
          display: 'block', fontSize: '11px', fontWeight: 500,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: sky, marginBottom: '20px',
        }}>
          Where we're headed
        </span>
        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 300,
          color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, margin: 0,
        }}>
          Contract intelligence is just the beginning. Venniq is building toward
          a full opportunity layer for professional services — connecting to every
          source in your market, and closing the loop from first alert to won deal.
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Early Access CTA
// ─────────────────────────────────────────────
function EarlyAccessSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [firm, setFirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { ref, inView } = useInView()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !firm) { setError('Please fill in all fields.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, firm }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="early-access" style={{
      background: `linear-gradient(160deg, ${abyss} 0%, ${navy} 100%)`,
      padding: '120px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '400px',
        background: `radial-gradient(ellipse, rgba(26,111,255,0.12) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div ref={ref} style={{
        maxWidth: '560px', margin: '0 auto', textAlign: 'center', position: 'relative',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 600,
          color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1,
        }}>
          See what your firm<br />
          <span style={{ color: sky }}>is missing.</span>
        </h2>
        <p style={{
          fontSize: '16px', fontWeight: 300,
          color: 'rgba(255,255,255,0.55)', margin: '0 0 48px', lineHeight: 1.6,
        }}>
          Request early access and we'll be in touch to walk you through exactly where Venniq would find opportunities inside your firm.
        </p>

        {submitted ? (
          <div style={{
            background: 'rgba(74,206,166,0.12)',
            border: '1px solid rgba(74,206,166,0.3)',
            borderRadius: '12px', padding: '28px 32px',
          }}>
            <p style={{ fontSize: '16px', color: '#4ACEA6', margin: 0, fontWeight: 500 }}>
              Request received — we'll be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { value: name, setter: setName, placeholder: 'Your name', type: 'text' },
              { value: firm, setter: setFirm, placeholder: 'Firm name', type: 'text' },
              { value: email, setter: setEmail, placeholder: 'Work email', type: 'email' },
            ].map((field, i) => (
              <input key={i}
                className="early-access-input"
                type={field.type}
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={{
                  width: '100%', padding: '14px 18px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#ffffff',
                  fontSize: '15px', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ))}
            {error && (
              <p style={{ fontSize: '13px', color: '#FF5C5C', margin: '4px 0 0', textAlign: 'left' }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} style={{
              marginTop: '8px',
              padding: '15px 32px', background: royal, color: '#ffffff',
              borderRadius: '8px', fontSize: '15px', fontWeight: 500,
              border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: `0 0 32px rgba(26,111,255,0.35)`,
              letterSpacing: '-0.01em',
            }}>
              {submitting ? 'Sending…' : 'Request Early Access →'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      background: abyss,
      borderTop: '1px solid rgba(194,212,248,0.08)',
      padding: '32px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '12px',
    }}>
      <Image
        src="/venniq-logo.png"
        alt="Venniq"
        width={100}
        height={30}
        style={{ objectFit: 'contain', background: '#ffffff', borderRadius: '8px', padding: '4px 8px' }}
      />
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
        © {new Date().getFullYear()} Venniq. All rights reserved.
      </p>
      <Link href="/login" style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.4)',
        textDecoration: 'none',
      }}>
        Sign in
      </Link>
    </footer>
  )
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <StatBanner />
      <ResearchSection />
      <ProblemSection />
      <WhatItIsSection />
      <HowItWorksSection />
      <DifferentiatorSection />
      <WhoSection />
      <VisionSection />
      <EarlyAccessSection />
      <Footer />
    </>
  )
}
