import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'
import './landing-ib.css'

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
] as const

function ArrowEnter({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      className="ib-arrow-cta"
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      <span aria-hidden="true">→</span>
    </button>
  )
}

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
        <main className="landing landing-ib">
          <header className="landing-top ib-top">
            <div className="landing-top-inner ib-top-inner">
              <span className="landing-brand-lockup ib-brand" aria-label="Backstop">
                <BrandMark size={28} />
                <em>Backstop</em>
              </span>
              <nav className="ib-nav" aria-label="Landing">
                <a href="#how-it-works">How it works</a>
                <a href="#human-gate">Human gate</a>
                <a href="#inside-demo">Inside</a>
                <a href="#sponsors">Stack</a>
              </nav>
              <div className="landing-nav-menu ib-menu">
                <button
                  className="landing-menu-bar"
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="landing-menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="visually-hidden">Menu</span>
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
                className="ib-filled-cta ib-filled-cta-compact"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening…' : 'Enter private demo'}
              </button>
            </div>
          </header>

          <section className="ib-hero" aria-labelledby="auth-title">
            <p className="ib-tag">
              <span className="ib-dot" aria-hidden="true" />
              Private demo
            </p>
            <h1 id="auth-title" className="ib-hero-display">
              Denial to appeal
              <br />
              you control.
            </h1>
            <p className="ib-hero-lede auth-lede">
              Drafts and sends the appeals you approve — not legal or medical advice.
            </p>
            <div className="ib-hero-actions">
              <button
                className="ib-filled-cta"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening private demo…' : 'Enter private demo'}
              </button>
              <ArrowEnter
                disabled={signingIn}
                onClick={() => void enterDemo()}
                label="Enter private demo"
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <section className="ib-section" id="how-it-works" aria-labelledby="how-title">
            <div className="ib-section-head">
              <p className="ib-counter">01 / 04</p>
              <h2 id="how-title">One clear path from denial to a draft you control.</h2>
            </div>
            <ol className="ib-steps">
              {STEPS.map(([title, copy], index) => (
                <li key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="ib-section ib-section-dark" id="human-gate" aria-labelledby="gate-title">
            <div className="ib-section-head">
              <p className="ib-counter ib-counter-dark">02 / 04</p>
              <h2 id="gate-title">Autonomy stops where your approval begins.</h2>
              <p className="ib-section-lede">
                Backstop can draft and prepare. It cannot send until you approve the exact words.
                That is the product promise, not a footnote.
              </p>
            </div>
            <div className="ib-gate-panel" role="list">
              {GATE_ROWS.map((row) => {
                const isActive = activeGate === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="listitem"
                    className={`ib-gate-row${isActive ? ' is-active' : ''}`}
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

          <section className="ib-section" id="demo-safety" aria-labelledby="safety-title">
            <div className="ib-section-head">
              <p className="ib-counter">03 / 04</p>
              <h2 id="safety-title">Built for a safe public demo.</h2>
            </div>
            <div className="ib-card-grid">
              <article>
                <p className="ib-tag">
                  <span className="ib-dot" aria-hidden="true" />
                  Boundary
                </p>
                <h3>Not HIPAA compliant</h3>
                <p>
                  This is a hackathon demo. Use only fictional or fully de-identified sample
                  documents. Never enter real health information.
                </p>
              </article>
              <article>
                <p className="ib-tag">
                  <span className="ib-dot" aria-hidden="true" />
                  Credentials
                </p>
                <h3>No credentials</h3>
                <p>
                  Backstop never asks for insurer logins, passwords, card numbers, or bank details.
                </p>
              </article>
              <article>
                <p className="ib-tag">
                  <span className="ib-dot" aria-hidden="true" />
                  Audit
                </p>
                <h3>Visible record</h3>
                <p>
                  Every external step appends to an immutable audit timeline so you can see what
                  happened and when.
                </p>
              </article>
            </div>
            <p className="ib-hipaa">
              Not HIPAA compliant. Never enter health information, passwords, insurer credentials,
              or payment details.
            </p>
          </section>

          <section className="ib-section" id="inside-demo" aria-labelledby="inside-title">
            <div className="ib-section-head">
              <p className="ib-counter">04 / 04</p>
              <h2 id="inside-title">What you will actually use.</h2>
              <p className="ib-section-lede">
                After you enter, the product is a quiet three-pane workspace: cases on the left,
                the document in the center, and properties or review actions on the right.
              </p>
            </div>
            <ol className="ib-steps">
              {INSIDE_DEMO.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="ib-section" id="sponsors" aria-label="Hackathon sponsors">
            <div className="ib-section-head">
              <p className="ib-tag">
                <span className="ib-dot" aria-hidden="true" />
                All Gas stack
              </p>
              <h2>The tools that make the private demo real.</h2>
              <p className="ib-section-lede">
                Every sponsor call runs on the Convex server path. Nothing sensitive is called from
                the browser.
              </p>
            </div>
            <ul className="ib-stack">
              {STACK.map((item) => (
                <li key={item.id}>
                  <div>
                    <p className="ib-tag">
                      <span className="ib-dot" aria-hidden="true" />
                      {item.role}
                    </p>
                    <h3>{item.name}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <a className="ib-stack-link" href={item.href} target="_blank" rel="noreferrer">
                    Visit {item.name}
                    <span className="ib-arrow-cta ib-arrow-cta-static" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="ib-close">
            <h2>Open the private demo when you are ready.</h2>
            <p>One medical-denial case type. Human approval stays the backstop.</p>
            <div className="ib-hero-actions">
              <button
                className="ib-filled-cta"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening private demo…' : 'Enter private demo'}
              </button>
              <ArrowEnter
                disabled={signingIn}
                onClick={() => void enterDemo()}
                label="Enter private demo"
              />
            </div>
          </section>

          <footer className="ib-footer">
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
