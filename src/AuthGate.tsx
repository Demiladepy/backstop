import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useState } from 'react'
import type { ReactNode } from 'react'

export function AuthGate({ children }: { children: ReactNode }) {
  const { signIn } = useAuthActions()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  const enterDemo = async () => {
    setError('')
    setSigningIn(true)
    try {
      await signIn('anonymous')
    } catch {
      setError(
        'The private demo could not open. Please try again after the development service is available.',
      )
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <>
      <AuthLoading>
        <main className="auth-loading" aria-live="polite">
          <span className="mark" aria-hidden="true">B</span>
          <p>Opening your private case record…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main className="auth-state">
          <header className="auth-bar">
            <span className="wordmark">
              <span className="mark" aria-hidden="true">B</span>
              Backstop
            </span>
            <p className="positioning-line">
              Drafts and sends the appeals you approve — not legal or medical advice.
            </p>
          </header>

          <section className="auth-hero">
            <div className="auth-entry" aria-labelledby="auth-title">
              <p className="kicker">Private demo · no password</p>
              <h1>The appeal is a document.</h1>
              <h2 id="auth-title">Begin without handing over credentials.</h2>
              <p>
                Backstop opens a browser-bound workspace for one medical-denial
                case at a time. You stay in control of every external action.
              </p>
              <button
                className="primary-action"
                type="button"
                disabled={signingIn}
                onClick={() => void enterDemo()}
              >
                {signingIn ? 'Opening private demo…' : 'Enter private demo'}
                {!signingIn && <span aria-hidden="true"> ↗</span>}
              </button>
              {error && <p className="form-error" role="alert">{error}</p>}
              <p className="field-help">
                Not HIPAA compliant. Never enter health information, passwords,
                insurer credentials, or payment details.
              </p>
            </div>

            <div className="auth-stage" aria-hidden="true">
              <article className="stage-card stage-card-denial">
                <span className="stage-mark">B</span>
                <p>Coverage determination</p>
                <strong>Sample denial</strong>
                <i /><i /><i />
                <em>Outpatient MRI · fictional</em>
              </article>
              <article className="stage-card stage-card-appeal">
                <span className="stage-mark">B</span>
                <p>Grounded appeal</p>
                <strong>Ready for your review</strong>
                <i /><i /><i />
                <em>Cited · not sent</em>
              </article>
            </div>
          </section>

          <section className="auth-promise">
            <div><span>01</span><p>Use fake or fully de-identified sample documents only.</p></div>
            <div><span>02</span><p>Nothing is sent until you approve the exact draft.</p></div>
            <div><span>03</span><p>Every consequential step leaves a visible record.</p></div>
          </section>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
