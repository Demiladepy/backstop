import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'
import './landing-ah.css'

const GATE_ROWS = [
  {
    id: 'draft',
    label: 'Draft ready',
    status: 'waiting',
    tone: 'muted' as const,
  },
  {
    id: 'review',
    label: 'Your review',
    status: 'required',
    tone: 'live' as const,
  },
  {
    id: 'outbound',
    label: 'Outbound email',
    status: 'locked',
    tone: 'muted' as const,
  },
]

const STACK = [
  {
    id: 'convex',
    name: 'Convex',
    role: 'Reactive backend',
    detail:
      'Live case state, file storage, scheduling, and audit. The board and appeal update as work finishes.',
    href: 'https://www.convex.dev/',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    role: 'Parse and policy research',
    detail:
      'Reads the sample denial packet and scrapes public policy pages into cited sources on the case.',
    href: 'https://www.firecrawl.dev/',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    role: 'Grounded drafting',
    detail:
      'Builds the appeal from stored sources only. Unsupported claims stay marked unverified.',
    href: 'https://openai.com/',
  },
  {
    id: 'agentmail',
    name: 'AgentMail',
    role: 'Human-gated send',
    detail:
      'Outbound mail and inbound replies. Nothing leaves until you approve the exact draft.',
    href: 'https://www.agentmail.to/',
  },
] as const

const INSIDE_DEMO = [
  {
    title: 'Case board',
    copy: 'Deadlines, needs-review queue, and a three-pane case file after you enter.',
  },
  {
    title: 'Evidence',
    copy: 'Denial letter plus EOB, then public policy clauses with URLs and retrieval times.',
  },
  {
    title: 'Appeal review',
    copy: 'Side-by-side documents, citation jumps, and approve as the only send gate.',
  },
  {
    title: 'Email, Watch, Record',
    copy: 'Threaded mail, deadline/form watch that stops before submit, and a sponsor-labeled audit trail.',
  },
] as const

const STEPS = [
  {
    title: 'Open a sample denial packet',
    copy: 'A fictional denial letter and EOB attach automatically. Backstop reads them into visible evidence.',
    tint: 'ember' as const,
  },
  {
    title: 'Find real policy language',
    copy: 'Search and scrape public payer policy, then keep every clause on the case.',
    tint: 'blossom' as const,
  },
  {
    title: 'Draft a cited appeal',
    copy: 'Paragraphs quote stored sources. Unsupported claims stay marked unverified.',
    tint: 'forest' as const,
  },
  {
    title: 'Approve before anything leaves',
    copy: 'Edit exact language, then approve. Sending only happens after that gate.',
    tint: 'petal' as const,
  },
] as const

export function AuthGate({ children }: { children: ReactNode }) {
  const { signIn } = useAuthActions()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeGate, setActiveGate] = useState('review')
  const [gatePinned, setGatePinned] = useState(false)

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

  return (
    <>
      <AuthLoading>
        <main className="auth-loading" aria-live="polite">
          <BrandMark size={40} />
          <p>Opening your private case record…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main className="landing landing-ah">
          <header className="ah-top">
            <div className="ah-pill-nav">
              <span className="ah-brand" aria-label="Backstop">
                <BrandMark size={28} />
                <em>Backstop</em>
              </span>
              <nav className="ah-nav" aria-label="Landing">
                <a href="#how-it-works">How it works</a>
                <a href="#human-gate">Human gate</a>
                <a href="#inside-demo">Inside</a>
                <a href="#sponsors">Stack</a>
              </nav>
              <div className="ah-menu">
                <button
                  className="ah-menu-btn"
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="landing-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="visually-hidden">Menu</span>
                  <span className="ah-menu-lines" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                </button>
                {menuOpen && (
                  <div className="ah-menu-panel" id="landing-menu" role="menu">
                    <a href="#how-it-works" role="menuitem" onClick={() => setMenuOpen(false)}>
                      How it works
                    </a>
                    <a href="#human-gate" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Human gate
                    </a>
                    <a href="#inside-demo" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Inside the demo
                    </a>
                    <a href="#demo-safety" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Demo safety
                    </a>
                    <a href="#sponsors" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Stack
                    </a>
                  </div>
                )}
              </div>
              <button
                className="ah-primary-cta ah-primary-cta-compact"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening…' : 'Enter private demo'}
              </button>
            </div>
          </header>

          <section className="ah-hero" aria-labelledby="auth-title">
            <div className="ah-orb ah-orb-ember" aria-hidden="true" />
            <div className="ah-orb ah-orb-blossom" aria-hidden="true" />
            <div className="ah-orb ah-orb-forest" aria-hidden="true" />
            <p className="ah-badge">Private demo</p>
            <h1 id="auth-title" className="ah-display">
              From a medical denial to an appeal you control.
            </h1>
            <p className="ah-lede auth-lede">
              Drafts and sends the appeals you approve — not legal or medical advice.
            </p>
            <div className="ah-hero-actions">
              <button
                className="ah-primary-cta"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening private demo…' : 'Enter private demo'}
              </button>
              <a className="ah-ghost-link" href="#how-it-works">
                See how it works
              </a>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <section className="ah-section" id="how-it-works" aria-labelledby="how-title">
            <div className="ah-section-head">
              <p className="ah-badge">The path</p>
              <h2 id="how-title">One clear path from denial to a draft you control.</h2>
            </div>
            <div className="ah-tint-grid">
              {STEPS.map((step) => (
                <article key={step.title} className={`ah-tint-card ah-tint-${step.tint}`}>
                  <button
                    className="ah-circle-arrow"
                    type="button"
                    disabled={signingIn}
                    onClick={() => void enterDemo()}
                    aria-label="Enter private demo"
                  >
                    →
                  </button>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ah-section" id="human-gate" aria-labelledby="gate-title">
            <div className="ah-section-head">
              <p className="ah-badge">The human gate</p>
              <h2 id="gate-title">Autonomy stops where your approval begins.</h2>
              <p className="ah-section-lede">
                Backstop can draft and prepare. It cannot send until you approve the exact words.
                That is the product promise, not a footnote.
              </p>
            </div>
            <div className="ah-white-card ah-gate-card" role="list">
              {GATE_ROWS.map((row) => {
                const isActive = activeGate === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="listitem"
                    className={`ah-gate-row${isActive ? ' is-active' : ''}`}
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

          <section className="ah-section" id="demo-safety" aria-labelledby="safety-title">
            <div className="ah-section-head">
              <p className="ah-badge">Demo boundary</p>
              <h2 id="safety-title">Built for a safe public demo.</h2>
            </div>
            <div className="ah-white-grid">
              <article className="ah-white-card">
                <p className="ah-badge ah-badge-info">Boundary</p>
                <h3>Not HIPAA compliant</h3>
                <p>
                  This is a hackathon demo. Use only fictional or fully de-identified sample
                  documents. Never enter real health information.
                </p>
              </article>
              <article className="ah-white-card">
                <p className="ah-badge ah-badge-info">Credentials</p>
                <h3>No credentials</h3>
                <p>
                  Backstop never asks for insurer logins, passwords, card numbers, or bank details.
                </p>
              </article>
              <article className="ah-white-card">
                <p className="ah-badge ah-badge-info">Audit</p>
                <h3>Visible record</h3>
                <p>
                  Every external step appends to an immutable audit timeline so you can see what
                  happened and when.
                </p>
              </article>
            </div>
            <p className="ah-hipaa">
              Not HIPAA compliant. Never enter health information, passwords, insurer credentials,
              or payment details.
            </p>
          </section>

          <section className="ah-section" id="inside-demo" aria-labelledby="inside-title">
            <div className="ah-section-head">
              <p className="ah-badge">Inside the private demo</p>
              <h2 id="inside-title">What you will actually use.</h2>
              <p className="ah-section-lede">
                After you enter, the product is a quiet three-pane workspace: cases on the left,
                the document in the center, and properties or review actions on the right.
              </p>
            </div>
            <div className="ah-white-grid ah-white-grid-2">
              {INSIDE_DEMO.map((item) => (
                <article key={item.title} className="ah-white-card">
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ah-section" id="sponsors" aria-label="Hackathon sponsors">
            <div className="ah-section-head">
              <p className="ah-badge">All Gas stack</p>
              <h2>The tools that make the private demo real.</h2>
              <p className="ah-section-lede">
                Every sponsor call runs on the Convex server path. Nothing sensitive is called from
                the browser.
              </p>
            </div>
            <ul className="ah-stack">
              {STACK.map((item) => (
                <li key={item.id} className="ah-white-card">
                  <div>
                    <p className="ah-badge ah-badge-info">{item.role}</p>
                    <h3>{item.name}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <a className="ah-ghost-link" href={item.href} target="_blank" rel="noreferrer">
                    Visit {item.name} →
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="ah-close">
            <p className="ah-badge">Ready when you are</p>
            <h2>Open the private demo.</h2>
            <p>One medical-denial case type. Human approval stays the backstop.</p>
            <button
              className="ah-primary-cta"
              type="button"
              disabled={signingIn}
              onClick={() => void enterDemo()}
            >
              {signingIn ? 'Opening private demo…' : 'Enter private demo'}
            </button>
          </section>

          <footer className="ah-footer">
            <p>
              Backstop · Demo only. Not HIPAA compliant.
              {' '}
              <a href="https://backstop-xi.vercel.app" target="_blank" rel="noreferrer">
                Live app
              </a>
              {' · '}
              <a href="https://github.com/Demiladepy/backstop" target="_blank" rel="noreferrer">
                GitHub
              </a>
              {' · '}
              <a
                href="https://github.com/Demiladepy/backstop/blob/master/DEMO.md"
                target="_blank"
                rel="noreferrer"
              >
                Demo script
              </a>
            </p>
          </footer>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
