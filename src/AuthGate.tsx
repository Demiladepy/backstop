import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { BrandMark } from './BrandMark'

const GATE_ROWS = [
  {
    id: 'draft',
    label: 'Draft ready',
    status: 'waiting',
    tone: 'muted' as const,
    color: 'cyan',
  },
  {
    id: 'review',
    label: 'Your review',
    status: 'required',
    tone: 'live' as const,
    color: 'lime',
  },
  {
    id: 'outbound',
    label: 'Outbound email',
    status: 'locked',
    tone: 'muted' as const,
    color: 'orchid',
  },
]

const STEP_COLORS = ['sky', 'sand', 'mint', 'rose'] as const

const SPONSOR_SLIDES = [
  {
    id: 'convex',
    name: 'Convex',
    role: 'Reactive backend',
    theme: 'ink',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    role: 'Grounded drafting',
    theme: 'void',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    role: 'Policy research',
    theme: 'moss',
  },
  {
    id: 'agentmail',
    name: 'AgentMail',
    role: 'Human-gated send',
    theme: 'indigo',
  },
] as const

export function AuthGate({ children }: { children: ReactNode }) {
  const { signIn } = useAuthActions()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeGate, setActiveGate] = useState('review')
  const [gatePinned, setGatePinned] = useState(false)
  const [sponsorIndex, setSponsorIndex] = useState(0)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (gatePinned) return
    const ids = GATE_ROWS.map((row) => row.id)
    const timer = window.setInterval(() => {
      setActiveGate((current) => {
        const next = ids[(ids.indexOf(current) + 1) % ids.length]
        return next
      })
    }, 2200)
    return () => window.clearInterval(timer)
  }, [gatePinned])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSponsorIndex((current) => (current + 1) % SPONSOR_SLIDES.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  const enterDemo = async () => {
    setError('')
    setSigningIn(true)
    try {
      await signIn('anonymous')
    } catch (caught) {
      const detail =
        caught instanceof Error
          ? caught.message.replace(/^Uncaught (ConvexError: )?/, '').slice(0, 220)
          : ''
      setError(
        detail
          ? `Could not open the private demo: ${detail}`
          : 'The private demo could not open. Please try again in a moment.',
      )
    } finally {
      setSigningIn(false)
    }
  }

  const shineMove = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty(
      '--mx',
      `${((event.clientX - rect.left) / rect.width) * 100}%`,
    )
    event.currentTarget.style.setProperty(
      '--my',
      `${((event.clientY - rect.top) / rect.height) * 100}%`,
    )
  }

  const ctaStyle = { '--mx': '50%', '--my': '50%' } as CSSProperties
  const activeSponsor = SPONSOR_SLIDES[sponsorIndex]

  return (
    <>
      <AuthLoading>
        <main className="auth-loading" aria-live="polite">
          <BrandMark size={40} />
          <p>Opening your private case record…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main className="landing landing-exact">
          <div className="landing-atmosphere" aria-hidden="true">
            <div className="landing-tile-grid">
              {Array.from({ length: 48 }, (_, index) => (
                <span key={index} className="landing-tile" />
              ))}
            </div>
            <div className="landing-hero-glow" />
          </div>

          <header className="landing-top">
            <div className="landing-top-inner">
              <span className="landing-brand-lockup" aria-label="Backstop">
                <BrandMark size={30} />
                <em>Backstop</em>
              </span>
              <div className="landing-nav-menu">
                <button
                  className="landing-menu-bar"
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="landing-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  Menu
                  <span className="landing-menu-lines" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                </button>
                {menuOpen && (
                  <div className="landing-menu-panel" id="landing-menu" role="menu">
                    <a href="#how-it-works" role="menuitem" onClick={() => setMenuOpen(false)}>
                      How it works
                    </a>
                    <a href="#human-gate" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Human gate
                    </a>
                    <a href="#demo-safety" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Demo safety
                    </a>
                    <a href="#sponsors" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Sponsors
                    </a>
                  </div>
                )}
              </div>
              <button
                className="enter-action enter-action-compact landing-top-cta"
                type="button"
                style={ctaStyle}
                disabled={signingIn}
                onPointerMove={shineMove}
                onClick={() => void enterDemo()}
              >
                <span className="enter-action-shine" aria-hidden="true" />
                <span>{signingIn ? 'Opening…' : 'Enter private demo'}</span>
              </button>
            </div>
          </header>

          <section className="landing-hero-center" aria-labelledby="auth-title">
            <div className="landing-hero-copy">
              <h1 className="landing-mega">BACKSTOP</h1>
              <h2 id="auth-title">From a medical denial to an appeal you control.</h2>
              <p className="auth-lede">
                Drafts and sends the appeals you approve — not legal or medical advice.
              </p>

              <div className="landing-cta-pair">
                <button
                  className="enter-action"
                  type="button"
                  style={ctaStyle}
                  disabled={signingIn}
                  onPointerMove={shineMove}
                  onClick={() => void enterDemo()}
                >
                  <span className="enter-action-shine" aria-hidden="true" />
                  <span>{signingIn ? 'Opening private demo…' : 'Enter private demo'}</span>
                  {!signingIn && <span aria-hidden="true">→</span>}
                </button>
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="landing-peek" aria-hidden="true">
              <article className="peek-card peek-card-a">
                <span>Coverage determination</span>
                <strong>Sample denial</strong>
                <i />
                <i />
                <i />
              </article>
              <article className="peek-card peek-card-b">
                <span>Policy source</span>
                <strong>Cited clause</strong>
                <i />
                <i />
                <i />
              </article>
              <article className="peek-card peek-card-c">
                <span>Grounded appeal</span>
                <strong>Ready for review</strong>
                <i />
                <i />
                <i />
                <em>Not sent</em>
              </article>
              <article className="peek-card peek-card-d">
                <span>Human gate</span>
                <strong>Your approval</strong>
                <i />
                <i />
                <i />
              </article>
              <article className="peek-card peek-card-e">
                <span>Audit trail</span>
                <strong>Every step logged</strong>
                <i />
                <i />
                <i />
              </article>
            </div>
          </section>

          <section className="landing-section" id="how-it-works" aria-labelledby="how-title">
            <div className="landing-section-head landing-section-head-center">
              <p className="kicker">How it works</p>
              <h2 id="how-title">
                One clear path from denial to a draft
                <em> you control.</em>
              </h2>
            </div>
            <ol className="landing-steps">
              {[
                [
                  'Open a sample denial packet',
                  'A fictional denial letter and EOB attach automatically. Backstop reads them into visible evidence.',
                ],
                [
                  'Find real policy language',
                  'Search and scrape public payer policy, then keep every clause on the case.',
                ],
                [
                  'Draft a cited appeal',
                  'Paragraphs quote stored sources. Unsupported claims stay marked unverified.',
                ],
                [
                  'Approve before anything leaves',
                  'Edit exact language, then approve. Sending only happens after that gate.',
                ],
              ].map(([title, copy], index) => (
                <li
                  key={title}
                  className={`landing-step neon-hover step-color-${STEP_COLORS[index]}`}
                >
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="landing-section landing-section-gate"
            id="human-gate"
            aria-labelledby="gate-title"
          >
            <div className="landing-gate-copy">
              <p className="kicker">The human gate</p>
              <h2 id="gate-title">Autonomy stops where your approval begins.</h2>
              <p>
                Backstop can draft and prepare. It cannot send until you approve the exact words.
                That is the product promise, not a footnote.
              </p>
            </div>
            <div className="landing-gate-panel" role="list">
              {GATE_ROWS.map((row) => {
                const isActive = activeGate === row.id
                const className = [
                  'gate-row',
                  `gate-color-${row.color}`,
                  row.tone === 'live' && isActive ? 'gate-row-live' : '',
                  isActive ? 'is-active' : '',
                  isActive && gatePinned ? 'is-popped' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={row.id}
                    type="button"
                    role="listitem"
                    className={className}
                    aria-pressed={isActive}
                    onClick={() => {
                      setActiveGate(row.id)
                      setGatePinned(true)
                    }}
                  >
                    <span>{row.label}</span>
                    {row.tone === 'live' && isActive ? (
                      <strong>{row.status}</strong>
                    ) : (
                      <em>{row.status}</em>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="landing-section" id="demo-safety" aria-labelledby="safety-title">
            <div className="landing-section-head landing-section-head-center">
              <p className="kicker">Demo boundary</p>
              <h2 id="safety-title">Built for a safe public demo.</h2>
            </div>
            <div className="landing-safety-grid">
              <article className="neon-hover safety-color-amber">
                <h3>Not HIPAA compliant</h3>
                <p>
                  This is a hackathon demo. Use only fictional or fully de-identified sample
                  documents. Never enter real health information.
                </p>
              </article>
              <article className="neon-hover safety-color-slate">
                <h3>No credentials</h3>
                <p>
                  Backstop never asks for insurer logins, passwords, card numbers, or bank details.
                </p>
              </article>
              <article className="neon-hover safety-color-teal">
                <h3>Visible record</h3>
                <p>
                  Every external step appends to an immutable audit timeline so you can see what
                  happened and when.
                </p>
              </article>
            </div>
            <p className="field-help landing-hipaa">
              Not HIPAA compliant. Never enter health information, passwords, insurer credentials,
              or payment details.
            </p>
          </section>

          <section className="landing-sponsors" id="sponsors" aria-label="Hackathon sponsors">
            <div className="landing-section-head landing-section-head-center">
              <p className="kicker">All Gas stack</p>
              <h2>The tools that make the private demo real.</h2>
            </div>

            <article
              className={`sponsor-stage sponsor-theme-${activeSponsor.theme}`}
              aria-roledescription="carousel"
              aria-label={`${activeSponsor.name}: ${activeSponsor.role}`}
            >
              <div className="sponsor-copy">
                <p className="sponsor-kicker">Built with</p>
                <p className="sponsor-name" key={activeSponsor.id}>
                  {activeSponsor.name}
                </p>
                <p className="sponsor-role">{activeSponsor.role}</p>
                <p className="sponsor-note">
                  Convex, OpenAI, Firecrawl, and AgentMail stay on the server path —
                  never in the browser.
                </p>

                <div className="sponsor-controls">
                  <div className="sponsor-dots" role="tablist" aria-label="Sponsors">
                    {SPONSOR_SLIDES.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        className={index === sponsorIndex ? 'is-active' : undefined}
                        aria-selected={index === sponsorIndex}
                        aria-label={slide.name}
                        onClick={() => setSponsorIndex(index)}
                      />
                    ))}
                  </div>
                  <div className="sponsor-arrows">
                    <button
                      type="button"
                      aria-label="Previous sponsor"
                      onClick={() =>
                        setSponsorIndex(
                          (current) =>
                            (current - 1 + SPONSOR_SLIDES.length) % SPONSOR_SLIDES.length,
                        )
                      }
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label="Next sponsor"
                      onClick={() =>
                        setSponsorIndex((current) => (current + 1) % SPONSOR_SLIDES.length)
                      }
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              <div className="sponsor-visual" aria-hidden="true">
                <svg className="sponsor-art" viewBox="0 0 520 420" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="sponsor-grid-fade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <radialGradient id="sponsor-sphere" cx="50%" cy="38%" r="62%">
                      <stop offset="0%" stopColor="var(--sphere-hi)" />
                      <stop offset="100%" stopColor="var(--sphere-lo)" />
                    </radialGradient>
                  </defs>
                  <rect width="520" height="420" fill="var(--stage-bg)" />
                  <g fill="none" stroke="url(#sponsor-grid-fade)" strokeWidth="1">
                    {Array.from({ length: 11 }, (_, i) => {
                      const t = i / 10
                      const y = 210 + t * t * 200
                      const inset = 28 + (1 - t) * 150
                      return (
                        <line key={`h-${i}`} x1={inset} y1={y} x2={520 - inset} y2={y} />
                      )
                    })}
                    {Array.from({ length: 13 }, (_, i) => {
                      const x = 28 + (i / 12) * 464
                      return <line key={`v-${i}`} x1={x} y1={420} x2={260} y2={210} />
                    })}
                  </g>
                  <ellipse cx="260" cy="248" rx="70" ry="9" fill="#000" opacity="0.25" />
                  <circle
                    cx="260"
                    cy="178"
                    r="72"
                    fill="url(#sponsor-sphere)"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    opacity="0.95"
                  />
                  {[
                    [-48, 0.58],
                    [-30, 0.8],
                    [-12, 0.94],
                    [0, 1],
                    [12, 0.94],
                    [30, 0.8],
                    [48, 0.58],
                  ].map(([dy, sx], index) => (
                    <ellipse
                      key={`lat-${index}`}
                      cx="260"
                      cy={178 + Number(dy)}
                      rx={72 * Number(sx)}
                      ry={9 + Math.abs(Number(dy)) * 0.06}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      opacity="0.7"
                    />
                  ))}
                </svg>
              </div>
            </article>
          </section>

          <section className="landing-close landing-close-light">
            <h2>Open the private demo when you are ready.</h2>
            <p>One medical-denial case type. Human approval stays the backstop.</p>
            <button
              className="enter-action"
              type="button"
              style={ctaStyle}
              disabled={signingIn}
              onPointerMove={shineMove}
              onClick={() => void enterDemo()}
            >
              <span className="enter-action-shine" aria-hidden="true" />
              <span>{signingIn ? 'Opening private demo…' : 'Enter private demo'}</span>
            </button>
          </section>

          <footer className="landing-brand-footer">
            <p className="landing-brand-word">
              Backst<span className="landing-brand-dot">o</span>p
            </p>
            <p className="landing-brand-copy">
              Backstop. All rights reserved. © 2026
            </p>
          </footer>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
