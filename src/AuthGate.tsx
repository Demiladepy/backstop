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
          <section className="auth-brand">
            <span className="wordmark"><span className="mark" aria-hidden="true">B</span>Backstop</span>
            <h1>The appeal is a <em>document.</em> Treat it like one.</h1>
            <p>Drafts and sends the appeals you approve — not legal or medical advice.</p>
          </section>
          <section className="auth-entry" aria-labelledby="auth-title">
            <p className="kicker">Private demo entrance / no password</p>
            <h2 id="auth-title">Begin without handing over credentials.</h2>
            <p>
              Backstop opens a browser-bound workspace for one medical-denial
              case at a time. You stay in control of every external action.
            </p>
            <div className="auth-promise">
              <div><span>01</span><p>Use fake or fully de-identified sample documents only.</p></div>
              <div><span>02</span><p>Nothing is sent until you approve the exact draft.</p></div>
              <div><span>03</span><p>Every consequential step leaves a visible record.</p></div>
            </div>
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
          </section>
        </main>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
