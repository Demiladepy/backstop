import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Backstop home">
          Backstop
        </a>
        <span className="phase">P0 · foundation</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Medical-denial advocacy, with a human in control</p>
          <div className="hero-layout">
            <div className="hero-copy">
              <h1 id="hero-title">
                Turn a medical denial into an evidence-backed appeal.
              </h1>
              <p className="positioning">
                Drafts and sends the appeals you approve — not legal or medical
                advice.
              </p>
            </div>

            <aside className="status" aria-label="Project status">
              <span className="status-label">Current state</span>
              <strong>Foundation setup in progress</strong>
              <p>
                Local checks pass. Cloud deployment and the public repository
                still need account authentication.
              </p>
            </aside>
          </div>
        </section>

        <section className="principles" aria-labelledby="principles-title">
          <div>
            <p className="section-number">01</p>
            <h2 id="principles-title">Built around review, not autopilot.</h2>
          </div>
          <ol>
            <li>
              <span>Evidence first</span>
              Factual draft claims need a source or an unverified label.
            </li>
            <li>
              <span>Approval before action</span>
              Nothing is sent or submitted without explicit human approval.
            </li>
            <li>
              <span>Accountable by default</span>
              Every future external action must leave an audit trail.
            </li>
          </ol>
        </section>
      </main>

      <footer>
        <p>
          Backstop is a hackathon demo and is not HIPAA compliant. Do not enter
          protected health information, credentials, or payment details.
        </p>
        <span>Live demo: TODO</span>
      </footer>
    </div>
  )
}

export default App
