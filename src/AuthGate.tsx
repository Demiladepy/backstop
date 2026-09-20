import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'

const GATE_ROWS = [
  { id: 'draft', label: 'Draft ready', status: 'waiting', tone: 'muted' as const },
  { id: 'review', label: 'Your review', status: 'required', tone: 'live' as const },
  { id: 'outbound', label: 'Outbound email', status: 'locked', tone: 'muted' as const },
]

const STEPS = [
  {
    title: 'Open a sample denial packet',
    copy: 'A fictional denial letter and EOB attach automatically. Backstop reads them into visible evidence.',
  },
  {
    title: 'Find real policy language',
    copy: 'Search and scrape public payer policy, then keep every clause on the case.',
  },
  {
    title: 'Draft a cited appeal',
    copy: 'Paragraphs quote stored sources. Unsupported claims stay marked unverified.',
  },
  {
    title: 'Approve before anything leaves',
    copy: 'Edit exact language, then approve. Sending only happens after that gate.',
  },
] as const

const PEEK = [
  { tag: 'Denial', title: 'Sample letter', note: 'FICTIONAL' },
  { tag: 'Policy', title: 'Cited clause', note: 'Live URL' },
  { tag: 'Appeal', title: 'Grounded draft', note: 'Not sent' },
  { tag: 'Gate', title: 'Your approval', note: 'Required' },
] as const

const STACK = [
  { name: 'Convex', role: 'Reactive backend' },
  { name: 'Firecrawl', role: 'Parse & research' },
  { name: 'OpenAI', role: 'Grounded drafting' },
  { name: 'AgentMail', role: 'Human-gated send' },
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
      setActiveGate((current) => ids[(ids.indexOf(current) + 1) % ids.length])
    }, 2400)
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
        <main className="landing landing-aw">
          <header className="aw-nav">
            <div className="aw-nav-inner">
              <span className="aw-brand" aria-label="Backstop">
                <BrandMark size={28} />
                <em>Backstop</em>
              </span>
              <nav className="aw-nav-links" aria-label="Landing">
                <a href="#how-it-works">How it works</a>
                <a href="#human-gate">Human gate</a>
                <a href="#demo-safety">Safety</a>
                <a href="#sponsors">Stack</a>
              </nav>
              <div className="aw-nav-actions">
                <div className="aw-menu">
                  <button
                    className="aw-menu-btn"
                    type="button"
                    aria-expanded={menuOpen}
                    aria-controls="aw-landing-menu"
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    Menu
                  </button>
                  {menuOpen && (
                    <div className="aw-menu-panel" id="aw-landing-menu" role="menu">
                      <a href="#how-it-works" role="menuitem" onClick={() => setMenuOpen(false)}>
                        How it works
                      </a>
                      <a href="#human-gate" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Human gate
                      </a>
                      <a href="#demo-safety" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Safety
                      </a>
                      <a href="#sponsors" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Stack
                      </a>
                    </div>
                  )}
                </div>
                <button
                  className="aw-cta aw-cta-pill"
                  type="button"
                  disabled={signingIn}
                  onClick={() => void enterDemo()}
                >
                  {signingIn ? 'Opening…' : 'Enter private demo'}
                </button>
              </div>
            </div>
          </header>

          <section className="aw-hero" aria-labelledby="auth-title">
            <div className="aw-hero-copy">
              <span className="aw-ember-badge">All Gas demo</span>
              <h1 className="aw-display">BACKSTOP</h1>
              <h2 id="auth-title">From a medical denial to an appeal you control.</h2>
              <p className="aw-lede">
                Drafts and sends the appeals you approve — not legal or medical advice.
              </p>
              <div className="aw-hero-actions">
                <button
                  className="aw-cta"
                  type="button"
                  disabled={signingIn}
                  onClick={() => void enterDemo()}
                >
                  {signingIn ? 'Opening private demo…' : 'Enter private demo'}
                  {!signingIn && <span aria-hidden="true">→</span>}
                </button>
                <a className="aw-ghost" href="#how-it-works">
                  See how it works
                </a>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="aw-peek" aria-hidden="true">
              {PEEK.map((card) => (
                <article className="aw-peek-card" key={card.title}>
                  <span>{card.tag}</span>
                  <strong>{card.title}</strong>
                  <em>{card.note}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="aw-section" id="how-it-works" aria-labelledby="how-title">
            <div className="aw-section-head">
              <p className="aw-kicker">How it works</p>
              <h2 id="how-title">One clear path from denial to a draft you control.</h2>
            </div>
            <ol className="aw-step-grid">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </li>
              ))}
            </ol>
          </section>

          <figure className="aw-breakthrough" aria-hidden="true">
            <img
              src="/images/moss.jpg"
              alt=""
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
            />
          </figure>

          <section className="aw-section" id="human-gate" aria-labelledby="gate-title">
            <div className="aw-dark-block">
              <div className="aw-dark-copy">
                <p className="aw-kicker is-light">The human gate</p>
                <h2 id="gate-title">Autonomy stops where your approval begins.</h2>
                <p>
                  Backstop can draft and prepare. It cannot send until you approve the exact words.
                  That is the product promise, not a footnote.
                </p>
              </div>
              <div className="aw-gate-list" role="list">
                {GATE_ROWS.map((row) => {
                  const isActive = activeGate === row.id
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="listitem"
                      className={`aw-gate-row${isActive ? ' is-active' : ''}${row.tone === 'live' && isActive ? ' is-live' : ''}`}
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
            </div>
          </section>

          <section className="aw-section" id="demo-safety" aria-labelledby="safety-title">
            <div className="aw-section-head">
              <p className="aw-kicker">Demo boundary</p>
              <h2 id="safety-title">Built for a safe public demo.</h2>
            </div>
            <div className="aw-card-grid">
              <article>
                <h3>Not HIPAA compliant</h3>
                <p>
                  Use only fictional or fully de-identified sample documents. Never enter real health
                  information.
                </p>
              </article>
              <article>
                <h3>No credentials</h3>
                <p>
                  Backstop never asks for insurer logins, passwords, card numbers, or bank details.
                </p>
              </article>
              <article>
                <h3>Visible record</h3>
                <p>
                  Every external step appends to an immutable audit timeline so you can see what
                  happened and when.
                </p>
              </article>
            </div>
          </section>

          <section className="aw-section" id="sponsors" aria-label="Hackathon sponsors">
            <div className="aw-section-head">
              <p className="aw-kicker">All Gas stack</p>
              <h2>The tools that make the private demo real.</h2>
            </div>
            <ul className="aw-stack">
              {STACK.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </li>
              ))}
            </ul>
          </section>

          <figure className="aw-breakthrough aw-breakthrough-close" aria-hidden="true">
            <img
              src="/images/forest.jpg"
              alt=""
              width={1600}
              height={900}
              loading="lazy"
              decoding="async"
            />
          </figure>

          <section className="aw-close">
            <h2>Open the private demo when you are ready.</h2>
            <p>One medical-denial case type. Human approval stays the backstop.</p>
            <button
              className="aw-cta"
              type="button"
              disabled={signingIn}
              onClick={() => void enterDemo()}
            >
              {signingIn ? 'Opening private demo…' : 'Enter private demo'}
            </button>
          </section>

          <footer className="aw-footer">
            <p>
              Demo only. Not HIPAA compliant.
              {' '}
              <a href="https://festive-roadrunner-713.convex.site" target="_blank" rel="noreferrer">
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
