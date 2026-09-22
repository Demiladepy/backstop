import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './landing-demos.css'

type Claim =
  | {
      id: string
      marker: string
      kind: 'quoted'
      text: string
      publisher: string
      title: string
      quote: string
      url: string
    }
  | { id: string; marker: string; kind: 'unverified'; text: string; note: string }

/*
 * The clauses Backstop actually cites in the live demo, verbatim, from pages
 * that return 200. Re-verify them alongside CURATED_POLICY_URLS in
 * convex/researchHelpers.ts before a release — a rotted link here would make
 * the landing page commit the exact failure the product exists to prevent.
 */
const CLAIMS: Claim[] = [
  {
    id: 'cms',
    marker: '1',
    kind: 'quoted',
    text: 'Imaging is covered when it is reasonable and necessary to diagnose the condition.',
    publisher: 'cms.gov',
    title: 'Medicare coverage determination process',
    quote:
      'items and services that are reasonable and necessary for the diagnosis or treatment of an illness or injury',
    url: 'https://www.cms.gov/medicare/coverage/determination-process',
  },
  {
    id: 'medicare',
    marker: '2',
    kind: 'quoted',
    text: 'Medical necessity is judged against accepted standards of medicine.',
    publisher: 'medicare.gov',
    title: 'Medicare coverage for diagnostic tests',
    quote:
      'Health care services or supplies needed to diagnose or treat an illness, injury, condition, disease, or its symptoms and that meet accepted standards of medicine.',
    url: 'https://www.medicare.gov/coverage/diagnostic-tests',
  },
  {
    id: 'unverified',
    marker: '?',
    kind: 'unverified',
    text: 'My symptoms clearly required the scan sooner.',
    note: 'No stored source supports this sentence, so Backstop labels it unverified instead of asserting it. You decide whether it stays.',
  },
]

export function EvidenceDemo() {
  const [activeId, setActiveId] = useState(CLAIMS[0]!.id)
  const active = CLAIMS.find((claim) => claim.id === activeId) ?? CLAIMS[0]!

  return (
    <section className="aw-breakthrough aw-proof aw-proof-evidence" aria-labelledby="evidence-demo-title">
      <img
        className="aw-proof-photo"
        src="/images/moss.jpg"
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
      />
      <div className="aw-proof-panel aw-proof-panel-evidence">
        <header className="aw-proof-head">
          <span className="aw-proof-kicker">Evidence first</span>
          <h2 id="evidence-demo-title">Every claim needs a source you can open.</h2>
          <p>Pick a sentence from a Backstop appeal to see what stands behind it.</p>
        </header>
        <div className="aw-proof-body">
          <ol className="aw-proof-claims" aria-label="Appeal sentences">
            {CLAIMS.map((claim) => {
              const isActive = claim.id === active.id
              return (
                <li key={claim.id}>
                  <button
                    type="button"
                    className={`aw-proof-claim${isActive ? ' is-active' : ''}${
                      claim.kind === 'unverified' ? ' is-unverified' : ''
                    }`}
                    aria-pressed={isActive}
                    aria-controls="evidence-demo-source"
                    onClick={() => setActiveId(claim.id)}
                    onMouseEnter={() => setActiveId(claim.id)}
                    onFocus={() => setActiveId(claim.id)}
                  >
                    <span className="aw-proof-claim-text">{claim.text}</span>
                    <span className="aw-proof-marker">
                      {claim.kind === 'unverified' ? 'Unverified' : `[${claim.marker}]`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div id="evidence-demo-source" className="aw-proof-source" aria-live="polite">
            {active.kind === 'quoted' ? (
              <div key={active.id} className="aw-proof-source-inner">
                <p className="aw-proof-source-meta">
                  [{active.marker}] · {active.publisher}
                </p>
                <p className="aw-proof-source-title">{active.title}</p>
                <blockquote>“{active.quote}”</blockquote>
                <a href={active.url} target="_blank" rel="noreferrer">
                  Open original ↗
                </a>
              </div>
            ) : (
              <div key={active.id} className="aw-proof-source-inner is-unverified">
                <p className="aw-proof-source-meta">No source found</p>
                <p className="aw-proof-source-title">Labelled, not asserted.</p>
                <p className="aw-proof-source-note">{active.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Keep in sync with the fill transition on .aw-gate-hold[data-holding]. */
const HOLD_MS = 1100

type GateState = 'review' | 'holding' | 'sent'

export function GateDemo() {
  const [state, setState] = useState<GateState>('review')
  const timer = useRef<number | null>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const holdRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  // Keyboard users land on the next control instead of losing focus when the
  // hold button is swapped out.
  useEffect(() => {
    if (!returnFocus.current) return
    if (state === 'sent') resetRef.current?.focus()
    if (state === 'review') holdRef.current?.focus()
    returnFocus.current = false
  }, [state])

  const start = () => {
    if (state !== 'review') return
    setState('holding')
    timer.current = window.setTimeout(() => {
      timer.current = null
      returnFocus.current = true
      setState('sent')
    }, HOLD_MS)
  }

  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setState((current) => (current === 'holding' ? 'review' : current))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    if (!event.repeat) start()
  }

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    cancel()
  }

  const sent = state === 'sent'
  const approval = sent ? 'Given' : state === 'holding' ? 'Holding…' : 'Required'

  return (
    <section
      className="aw-breakthrough aw-breakthrough-close aw-proof aw-proof-gate"
      aria-labelledby="gate-demo-title"
    >
      <img
        className="aw-proof-photo"
        src="/images/forest.jpg"
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        loading="lazy"
        decoding="async"
      />
      <div className="aw-proof-panel aw-proof-panel-gate" data-state={state}>
        <header className="aw-proof-head">
          <span className="aw-proof-kicker">Human gate</span>
          <h2 id="gate-demo-title">Nothing leaves until you approve the exact words.</h2>
        </header>

        <article className="aw-gate-draft" aria-label="Draft appeal preview">
          <p className="aw-gate-draft-meta">To appeals@example.com · fictional</p>
          <p className="aw-gate-draft-subject">Appeal for denial of outpatient MRI</p>
          <p className="aw-gate-draft-body">
            Medicare covers items and services that are reasonable and necessary for the
            diagnosis of an illness [1], judged against accepted standards of medicine [2].
          </p>
        </article>

        <ol className="aw-gate-rail" aria-label="Send status">
          <li className="is-done">
            <span>Draft</span>
            <b>Ready</b>
          </li>
          <li className={sent ? 'is-done' : 'is-live'}>
            <span>Your approval</span>
            <b>{approval}</b>
          </li>
          <li className={sent ? 'is-done' : 'is-locked'}>
            <span>Outbound email</span>
            <b>{sent ? 'Sent' : 'Locked'}</b>
          </li>
        </ol>

        {sent ? (
          <div className="aw-gate-done" role="status">
            <p>Sent only after you held approve. In the product it goes out through AgentMail.</p>
            <button
              ref={resetRef}
              type="button"
              className="aw-gate-reset"
              onClick={() => {
                returnFocus.current = true
                setState('review')
              }}
            >
              Reset preview
            </button>
          </div>
        ) : (
          <button
            ref={holdRef}
            type="button"
            className="aw-gate-hold"
            data-holding={state === 'holding' ? '' : undefined}
            aria-describedby="gate-demo-hint"
            onPointerDown={(event) => {
              // Capture keeps a small finger drift from cancelling the hold;
              // it can throw for some pointer types, which must not block approval.
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                /* hold still works without capture */
              }
              start()
            }}
            onPointerUp={cancel}
            onPointerCancel={cancel}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onBlur={cancel}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span className="aw-gate-hold-fill" aria-hidden="true" />
            <span className="aw-gate-hold-label">
              {state === 'holding' ? 'Keep holding…' : 'Press and hold to approve'}
            </span>
          </button>
        )}

        <p id="gate-demo-hint" className="aw-proof-fineprint">
          Hold for about a second, on purpose. Preview only — this page sends nothing.
        </p>
      </div>
    </section>
  )
}
