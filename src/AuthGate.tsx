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

const FAQS = [
  {
    q: 'What is Backstop?',
    a: 'Backstop helps you turn a medical insurance denial into a cited appeal you control. It drafts from stored evidence and only sends after you approve.',
  },
  {
    q: 'How does Backstop work?',
    a: 'Open a sample denial packet. Firecrawl parses and researches public policy. OpenAI drafts a cited appeal. You review, then approve. AgentMail sends only after that gate.',
  },
  {
    q: 'Will Backstop send email without my approval?',
    a: 'No. Approve is the only send gate. Follow-ups and form fills also wait for your explicit approval.',
  },
  {
    q: 'Is this HIPAA compliant?',
    a: 'No. This is a public hackathon demo. Use only fictional or fully de-identified sample documents. Never enter real health information.',
  },
  {
    q: 'What stack powers the demo?',
    a: 'Convex for the reactive backend, Firecrawl for parse and policy research, OpenAI for grounded drafting, and AgentMail for human-gated email.',
  },
] as const

export function AuthGate({ children }: { children: ReactNode }) {
  const { signIn } = useAuthActions()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeGate, setActiveGate] = useState('review')
  const [gatePinned, setGatePinned] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

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
                <a href="#faq">FAQ</a>
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
                      <a href="#faq" role="menuitem" onClick={() => setMenuOpen(false)}>
                        FAQ
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

          <section className="aw-hero aw-hero-mercury" aria-labelledby="auth-title">
            <div className="aw-hero-mercury-media" aria-hidden="true">
              <img
                src="/images/alpine.jpg"
                alt=""
                width={2000}
                height={1200}
                decoding="async"
              />
            </div>
            <div className="aw-hero-mercury-overlay" aria-hidden="true" />
            <div className="aw-hero-mercury-inner">
              <div className="aw-hero-copy">
                <span className="aw-mercury-badge">All Gas demo</span>
                <h1 className="aw-display">Backstop</h1>
                <h2 id="auth-title">From a medical denial to an appeal you control.</h2>
                <p className="aw-lede">
                  Drafts and sends the appeals you approve. Not legal or medical advice.
                </p>
                <div className="aw-hero-actions">
                  <button
                    className="aw-cta aw-cta-cobalt"
                    type="button"
                    disabled={signingIn}
                    onClick={() => void enterDemo()}
                  >
                    {signingIn ? 'Opening private demo…' : 'Enter private demo'}
                  </button>
                  <a className="aw-ghost aw-ghost-ivory" href="#how-it-works">
                    See how it works
                  </a>
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="aw-peek aw-peek-bridge" aria-hidden="true">
            {PEEK.map((card) => (
              <article className="aw-peek-card" key={card.title}>
                <span>{card.tag}</span>
                <strong>{card.title}</strong>
                <em>{card.note}</em>
              </article>
            ))}
          </div>

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

          <section className="aw-section aw-faq" id="faq" aria-labelledby="faq-title">
            <div className="aw-faq-layout">
              <div className="aw-faq-intro">
                <h2 id="faq-title">FAQ</h2>
                <p>Common questions about the private demo.</p>
                <div className="aw-faq-tools" aria-hidden="true">
                  <span>CV</span>
                  <span>FC</span>
                  <span>AI</span>
                  <span>AM</span>
                </div>
              </div>
              <div className="aw-faq-list">
                {FAQS.map((item, index) => {
                  const isOpen = openFaq === index
                  return (
                    <div
                      key={item.q}
                      className={`aw-faq-item${isOpen ? ' is-open' : ''}`}
                    >
                      <button
                        type="button"
                        className="aw-faq-trigger"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${index}`}
                        id={`faq-trigger-${index}`}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                      >
                        <span>{item.q}</span>
                        <i aria-hidden="true">{isOpen ? '▴' : '▾'}</i>
                      </button>
                      <div
                        className="aw-faq-panel"
                        id={`faq-panel-${index}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${index}`}
                        hidden={!isOpen}
                      >
                        <p>{item.a}</p>
                      </div>
                    </div>
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

          <footer className="aw-site-footer">
            <div className="aw-mega-bar">
              <p className="aw-mega-guide">
                <span aria-hidden="true">✦</span>
                Human approval is the backstop
              </p>
              <a className="aw-mega-chip" href="#demo-safety">
                Demo only
                <em>safe</em>
              </a>
            </div>

            <p className="aw-mega-word" aria-label="Backstop">
              backstop*
            </p>

            <div className="aw-footer-grid">
              <div className="aw-footer-card">
                <h3>Get in touch</h3>
                <p className="aw-footer-meta">
                  <span aria-hidden="true">◎</span>
                  Convex All Gas hackathon demo. Not a clinic or insurer portal.
                </p>
                <div className="aw-footer-contacts">
                  <a href="https://github.com/Demiladepy/backstop" target="_blank" rel="noreferrer">
                    <span aria-hidden="true">⌘</span>
                    github.com/Demiladepy/backstop
                  </a>
                  <a href="https://festive-roadrunner-713.convex.site" target="_blank" rel="noreferrer">
                    <span aria-hidden="true">↗</span>
                    festive-roadrunner-713.convex.site
                  </a>
                </div>
                <div className="aw-footer-social" aria-label="Project links">
                  <a
                    href="https://github.com/Demiladepy/backstop"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  >
                    GH
                  </a>
                  <a
                    href="https://github.com/Demiladepy/backstop/blob/master/DEMO.md"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Demo script"
                  >
                    DM
                  </a>
                  <a href="#sponsors" aria-label="Stack sponsors">
                    ST
                  </a>
                  <a href="#how-it-works" aria-label="How it works">
                    HW
                  </a>
                </div>
              </div>

              <div className="aw-footer-col">
                <h4>Product</h4>
                <ul>
                  <li><a href="#how-it-works">How it works</a></li>
                  <li><a href="#human-gate">Human gate</a></li>
                  <li><a href="#faq">FAQ</a></li>
                  <li><a href="#sponsors">All Gas stack</a></li>
                  <li>
                    <button type="button" onClick={() => void enterDemo()}>
                      Enter private demo
                    </button>
                  </li>
                </ul>
              </div>

              <div className="aw-footer-col">
                <h4>Demo</h4>
                <ul>
                  <li>
                    <a
                      href="https://festive-roadrunner-713.convex.site"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Live app
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Demiladepy/backstop/blob/master/DEMO.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Demo script
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/Demiladepy/backstop/releases/tag/demo-video"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Demo video
                    </a>
                  </li>
                  <li><a href="#demo-safety">Demo safety</a></li>
                </ul>
              </div>

              <div className="aw-footer-col">
                <h4>Stack</h4>
                <ul>
                  <li>
                    <a href="https://www.convex.dev/" target="_blank" rel="noreferrer">
                      Convex
                    </a>
                  </li>
                  <li>
                    <a href="https://www.firecrawl.dev/" target="_blank" rel="noreferrer">
                      Firecrawl
                    </a>
                  </li>
                  <li>
                    <a href="https://openai.com/" target="_blank" rel="noreferrer">
                      OpenAI
                    </a>
                  </li>
                  <li>
                    <a href="https://www.agentmail.to/" target="_blank" rel="noreferrer">
                      AgentMail
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="aw-footer-bottom">
              <p>
                <BrandMark size={22} />
                <span>
                  Demo only. Not HIPAA compliant. Never enter real health information or credentials.
                </span>
              </p>
              <p className="aw-footer-copy">Backstop · medical-denial advocacy</p>
            </div>
          </footer>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
