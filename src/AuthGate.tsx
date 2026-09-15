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
              <h2 id="safety-title">Built for a safe public demo</h2>
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

          <section className="landing-section" id="inside-demo" aria-labelledby="inside-title">
            <div className="landing-section-head">
              <p className="kicker">Inside the private demo</p>
              <h2 id="inside-title">What you will actually use</h2>
              <p className="landing-section-lede">
                After you enter, the product is a quiet three-pane workspace: cases on the left,
                the document in the center, and properties or review actions on the right.
              </p>
            </div>
            <ol className="inside-stack">
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

          <section className="landing-sponsors" id="sponsors" aria-label="Hackathon sponsors">
            <div className="landing-section-head">
              <p className="kicker">All Gas stack</p>
              <h2>The tools that make the private demo real</h2>
              <p className="landing-section-lede">
                Every sponsor call runs on the Convex server path. Nothing sensitive is called from the browser.
              </p>
            </div>

            <ul className="stack-list">
              {STACK.map((item) => (
                <li key={item.id}>
                  <div className="stack-copy">
                    <p className="sponsor-kicker">{item.role}</p>
                    <h3>{item.name}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <a
                    className="stack-link"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit {item.name}
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-close landing-close-light">
            <h2>Open the private demo when you are ready</h2>
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
            <p className="landing-brand-word">Backstop</p>
            <p className="landing-brand-copy">
              Demo only. Not HIPAA compliant.
            </p>
            <nav className="landing-footer-links" aria-label="Project links">
              <a href="https://backstop-xi.vercel.app" target="_blank" rel="noreferrer">
                Live app
              </a>
              <a href="https://github.com/Demiladepy/backstop" target="_blank" rel="noreferrer">
                GitHub
              </a>
              <a href="https://github.com/Demiladepy/backstop/blob/master/DEMO.md" target="_blank" rel="noreferrer">
                Demo script
              </a>
            </nav>
          </footer>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
