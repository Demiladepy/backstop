import { useAuthActions } from '@convex-dev/auth/react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../convex/_generated/api'
import type { Doc, Id } from '../convex/_generated/dataModel'
import './App.css'
import { AuthGate } from './AuthGate'

type CaseTab = 'case' | 'evidence' | 'appeal' | 'email' | 'record'
type DraftParagraph = Doc<'drafts'>['paragraphs'][number]

const statusCopy: Record<Doc<'cases'>['status'], string> = {
  intake: 'Intake',
  parsing: 'Reading document',
  researching: 'Finding policy',
  drafting: 'Drafting appeal',
  awaiting_approval: 'Needs your review',
  approved: 'Approved',
  sent: 'Sent',
  awaiting_reply: 'Awaiting reply',
  resolved: 'Resolved',
  closed: 'Closed',
  error: 'Needs attention',
}

const workflow = [
  { label: 'Intake', statuses: ['intake'] },
  { label: 'Evidence', statuses: ['parsing', 'researching'] },
  { label: 'Draft', statuses: ['drafting'] },
  { label: 'Review', statuses: ['awaiting_approval', 'approved'] },
  { label: 'Reply', statuses: ['sent', 'awaiting_reply', 'resolved', 'closed'] },
]

function readableError(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/^Uncaught (ConvexError: )?/, '')
  }
  return 'That did not finish. Please try again.'
}

function formatDate(timestamp: number, includeTime = false) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(timestamp)
}

function Mark({ name }: { name: string }) {
  return (
    <span className="mark" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function App() {
  return (
    <AuthGate>
      <Workspace />
    </AuthGate>
  )
}

function Workspace() {
  const { signOut } = useAuthActions()
  const cases = useQuery(api.cases.listCases, { limit: 50 })
  const approvals = useQuery(api.cases.pendingApprovals, { limit: 50 })
  const [selectedCaseId, setSelectedCaseId] = useState<Id<'cases'> | null>(null)
  const [creating, setCreating] = useState(false)

  const openCase = (caseId: Id<'cases'>) => {
    setSelectedCaseId(caseId)
    setCreating(false)
  }

  return (
    <div className="product-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="product-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => {
            setSelectedCaseId(null)
            setCreating(false)
          }}
          aria-label="Backstop case board"
        >
          <Mark name="B" />
          Backstop
        </button>
        <p className="positioning-line">
          Drafts and sends the appeals you approve — not legal or medical advice.
        </p>
        <nav className="header-actions" aria-label="Account">
          {approvals && approvals.length > 0 && (
            <span className="approval-count">{approvals.length} to review</span>
          )}
          <button className="text-button" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </nav>
      </header>

      <main id="main-content">
        {creating ? (
          <Intake
            onCancel={() => setCreating(false)}
            onCreated={openCase}
          />
        ) : selectedCaseId ? (
          <CaseWorkspace
            key={selectedCaseId}
            caseId={selectedCaseId}
            cases={cases ?? []}
            onSelect={openCase}
            onNew={() => setCreating(true)}
            onBoard={() => setSelectedCaseId(null)}
          />
        ) : (
          <CaseBoard
            cases={cases}
            onSelect={openCase}
            onNew={() => setCreating(true)}
          />
        )}
      </main>

      <footer className="product-footer">
        <div>
          <Mark name="B" />
          <strong>Backstop</strong>
        </div>
        <p>
          Demo only. Not HIPAA compliant. Use fake or sample documents only.
          Never enter health information, passwords, credentials, or payment details.
        </p>
        <span>Human approval is the backstop.</span>
      </footer>
    </div>
  )
}

function CaseBoard({
  cases,
  onSelect,
  onNew,
}: {
  cases: Doc<'cases'>[] | undefined
  onSelect: (id: Id<'cases'>) => void
  onNew: () => void
}) {
  if (cases === undefined) {
    return <BoardSkeleton />
  }

  return (
    <section className="board page-enter" aria-labelledby="board-title">
      <div className="board-intro">
        <p className="kicker">Your cases / live record</p>
        <h1 id="board-title">
          A clear next step,<br />
          <em>all the way through.</em>
        </h1>
        <p>
          Start with a sample denial. Backstop reads it, finds relevant policy
          language, and prepares an appeal for your review.
        </p>
        <button className="primary-action" type="button" onClick={onNew}>
          Start a sample case <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div className="board-register">
        <div className="register-heading">
          <span>Open folios</span>
          <span>{String(cases.length).padStart(2, '0')}</span>
        </div>
        {cases.length === 0 ? (
          <div className="empty-register">
            <span className="folio">No. 000</span>
            <h2>No case file yet.</h2>
            <p>
              Use a fictional denial letter so you can explore every step
              without sharing sensitive information.
            </p>
          </div>
        ) : (
          <ol className="case-list">
            {cases.map((item, index) => (
              <li key={item._id}>
                <button type="button" onClick={() => onSelect(item._id)}>
                  <span className="case-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="case-title">
                    <strong>{item.title}</strong>
                    <small>{item.counterpartyName ?? 'Payer not named'}</small>
                  </span>
                  <span className={`status-signal status-${item.status}`}>
                    {statusCopy[item.status]}
                  </span>
                  <span className="case-date">{formatDate(item.updatedAt)}</span>
                  <span className="arrow" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function BoardSkeleton() {
  return (
    <section className="board board-loading" aria-live="polite" aria-label="Loading cases">
      <div className="board-intro">
        <span className="skeleton short" />
        <span className="skeleton headline" />
        <span className="skeleton body" />
      </div>
      <div className="board-register">
        <div className="register-heading"><span>Opening your record…</span></div>
        {[1, 2, 3].map((item) => <span className="skeleton row" key={item} />)}
      </div>
    </section>
  )
}

function Intake({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (id: Id<'cases'>) => void
}) {
  const createCase = useMutation(api.cases.createCase)
  const [title, setTitle] = useState('Sample denial — outpatient MRI')
  const [payer, setPayer] = useState('Northstar Health Plan')
  const [email, setEmail] = useState('appeals@example.com')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!payer.trim() || !email.trim()) {
      setError('Enter the payer name and appeal email to create a sendable flow.')
      return
    }
    setBusy(true)
    try {
      const caseId = await createCase({
        title,
        category: 'medical_denial',
        counterpartyName: payer,
        counterpartyEmail: email,
        deadlineAt: deadline ? new Date(`${deadline}T12:00:00`).getTime() : undefined,
      })
      onCreated(caseId)
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intake page-enter" aria-labelledby="intake-title">
      <div className="intake-note">
        <button className="back-button" type="button" onClick={onCancel}>← Case board</button>
        <p className="kicker">New case / medical denial</p>
        <h1 id="intake-title">Begin with the envelope.</h1>
        <p className="intake-lede">
          Tell us who issued the denial. You will add the sample letter next.
        </p>
        <div className="safety-note">
          <span>Demo boundary</span>
          <p>
            Backstop is not HIPAA compliant. Use only fictional or fully
            de-identified sample files. We will never ask for an insurer login.
          </p>
        </div>
      </div>

      <form className="intake-form" onSubmit={(event) => void submit(event)}>
        <div className="form-folio">
          <span>Form 01</span>
          <span>Required fields *</span>
        </div>
        <label>
          <span>Case title *</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            minLength={3}
            maxLength={160}
            required
          />
          <small>Keep it recognizable; do not use a real patient name.</small>
        </label>
        <div className="field-pair">
          <label>
            <span>Payer name *</span>
            <input
              value={payer}
              onChange={(event) => setPayer(event.target.value)}
              maxLength={160}
              required
            />
          </label>
          <label>
            <span>Appeal email *</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>
        </div>
        <label className="deadline-field">
          <span>Deadline <i>optional</i></span>
          <input
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            type="date"
          />
        </label>
        <div className="fixed-category">
          <span>Case type</span>
          <strong>Medical denial</strong>
          <small>Backstop currently supports this case type only.</small>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? 'Opening case…' : 'Open case file'}
          </button>
          <button className="text-button" type="button" onClick={onCancel}>
            Keep case board
          </button>
        </div>
      </form>
    </section>
  )
}

function CaseWorkspace({
  caseId,
  cases,
  onSelect,
  onNew,
  onBoard,
}: {
  caseId: Id<'cases'>
  cases: Doc<'cases'>[]
  onSelect: (id: Id<'cases'>) => void
  onNew: () => void
  onBoard: () => void
}) {
  const detail = useQuery(api.cases.getCase, { caseId })
  const thread = useQuery(api.email.listThread, { caseId })
  const [tab, setTab] = useState<CaseTab>('case')

  if (detail === undefined) return <CaseSkeleton onBoard={onBoard} />
  if (detail === null) {
    return (
      <section className="not-found">
        <p className="kicker">Case unavailable</p>
        <h1>This folio is no longer in your record.</h1>
        <button className="primary-action" type="button" onClick={onBoard}>Return to case board</button>
      </section>
    )
  }

  return (
    <section className="case-workspace page-enter">
      <aside className="case-rail" aria-label="Case navigation">
        <button className="back-button" type="button" onClick={onBoard}>← All cases</button>
        <div className="rail-list">
          {cases.map((item, index) => (
            <button
              className={item._id === caseId ? 'active' : ''}
              type="button"
              key={item._id}
              onClick={() => onSelect(item._id)}
              aria-current={item._id === caseId ? 'page' : undefined}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
              <i className={`dot status-${item.status}`} />
            </button>
          ))}
        </div>
        <button className="new-case-button" type="button" onClick={onNew}>＋ New sample case</button>
      </aside>

      <div className="case-main">
        <CaseHeader caseRow={detail.case} />
        <nav className="case-tabs" aria-label="Case file sections">
          {([
            ['case', 'Case'],
            ['evidence', `Evidence ${detail.sources.length}`],
            ['appeal', `Appeal ${detail.drafts.length}`],
            ['email', `Email ${detail.messages.length}`],
            ['record', `Record ${detail.audit.length}`],
          ] as Array<[CaseTab, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? 'active' : ''}
              aria-current={tab === value ? 'page' : undefined}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="case-content">
          {tab === 'case' && <CaseOverview detail={detail} setTab={setTab} />}
          {tab === 'evidence' && <EvidenceView detail={detail} />}
          {tab === 'appeal' && (
            <AppealView
              key={`${detail.drafts[0]?._id ?? 'empty'}-${detail.drafts[0]?.updatedAt ?? 0}`}
              detail={detail}
            />
          )}
          {tab === 'email' && <EmailView detail={detail} thread={thread} />}
          {tab === 'record' && <AuditView audit={detail.audit} />}
        </div>
      </div>
    </section>
  )
}

function CaseHeader({ caseRow }: { caseRow: Doc<'cases'> }) {
  const activeIndex = Math.max(
    0,
    workflow.findIndex((step) => step.statuses.includes(caseRow.status)),
  )
  return (
    <header className="case-header">
      <div className="case-heading">
        <p className="kicker">
          Folio {caseRow._id.slice(-5).toUpperCase()} / {statusCopy[caseRow.status]}
        </p>
        <h1>{caseRow.title}</h1>
        <dl>
          <div><dt>Payer</dt><dd>{caseRow.counterpartyName ?? 'Not provided'}</dd></div>
          <div><dt>Appeal email</dt><dd>{caseRow.counterpartyEmail ?? 'Not provided'}</dd></div>
          <div><dt>Opened</dt><dd>{formatDate(caseRow.createdAt)}</dd></div>
          <div><dt>Deadline</dt><dd>{caseRow.deadlineAt ? formatDate(caseRow.deadlineAt) : 'No date set'}</dd></div>
        </dl>
      </div>
      <ol className="workflow-line" aria-label={`Current status: ${statusCopy[caseRow.status]}`}>
        {workflow.map((step, index) => (
          <li
            key={step.label}
            className={index < activeIndex ? 'complete' : index === activeIndex ? 'current' : ''}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step.label}
          </li>
        ))}
      </ol>
    </header>
  )
}

function CaseOverview({
  detail,
  setTab,
}: {
  detail: NonNullable<ReturnType<typeof useQuery<typeof api.cases.getCase>>>
  setTab: (tab: CaseTab) => void
}) {
  const latestDraft = detail.drafts[0]
  const next = getNextStep(detail)
  return (
    <div className="overview-grid">
      <section className="next-step" aria-labelledby="next-title">
        <p className="kicker">Next action</p>
        <h2 id="next-title">{next.title}</h2>
        <p>{next.copy}</p>
        <button className="primary-action" type="button" onClick={() => setTab(next.tab)}>
          {next.action} <span aria-hidden="true">→</span>
        </button>
      </section>
      <section className="case-sheet" aria-label="Case summary">
        <div className="sheet-folio">
          <span>Case memorandum</span>
          <span>Pg. 01</span>
        </div>
        <h3>{detail.case.title}</h3>
        <p className="sheet-deck">
          Appeal record prepared for {detail.case.counterpartyName ?? 'the payer'}.
        </p>
        <dl className="sheet-facts">
          <div><dt>Documents</dt><dd>{detail.documents.length}</dd></div>
          <div><dt>Policy sources</dt><dd>{detail.sources.filter((source) => source.kind === 'policy').length}</dd></div>
          <div><dt>Cited paragraphs</dt><dd>{latestDraft?.paragraphs.filter((p) => p.verification === 'cited').length ?? 0}</dd></div>
          <div><dt>External messages</dt><dd>{detail.messages.length}</dd></div>
        </dl>
        <p className="sheet-positioning">
          Drafts and sends the appeals you approve — not legal or medical advice.
        </p>
      </section>
      <section className="recent-record">
        <div className="section-heading">
          <h3>Recent record</h3>
          <button type="button" onClick={() => setTab('record')}>Full timeline</button>
        </div>
        {detail.audit.slice(0, 4).map((entry) => (
          <div className="record-line" key={entry._id}>
            <Mark name={entry.actor} />
            <p><strong>{humanizeEvent(entry.event)}</strong><span>{entry.detail}</span></p>
            <time>{formatDate(entry.createdAt, true)}</time>
          </div>
        ))}
      </section>
    </div>
  )
}

function getNextStep(detail: {
  case: Doc<'cases'>
  documents: Doc<'documents'>[]
  sources: Doc<'sources'>[]
  drafts: Doc<'drafts'>[]
}) {
  if (detail.documents.length === 0) {
    return { title: 'Add the sample denial letter.', copy: 'PDF, Word, HTML, CSV, or plain text. Backstop will create the first evidence source from it.', action: 'Add document', tab: 'evidence' as const }
  }
  if (detail.documents.some((document) => document.status === 'parsing')) {
    return { title: 'The letter is being read.', copy: 'This page updates live. You can stay here while the document becomes a cited source.', action: 'Watch evidence', tab: 'evidence' as const }
  }
  if (!detail.sources.some((source) => source.kind === 'policy')) {
    return { title: 'Find the policy behind the denial.', copy: 'Search public policy material and keep every retrieved clause attached to this case.', action: 'Research policy', tab: 'evidence' as const }
  }
  if (!detail.drafts.length || detail.drafts[0].status === 'rejected') {
    return { title: 'Build a grounded appeal.', copy: 'Backstop drafts from this case’s stored evidence. Unsupported language stays visibly marked.', action: 'Draft appeal', tab: 'appeal' as const }
  }
  if (detail.drafts[0].status === 'pending_approval') {
    return { title: 'The appeal is waiting for you.', copy: 'Read every paragraph, inspect its sources, edit if needed, then approve or reject it.', action: 'Review appeal', tab: 'appeal' as const }
  }
  return { title: 'Follow the conversation.', copy: 'The approved appeal and any reply remain together in a readable thread.', action: 'Open email thread', tab: 'email' as const }
}

function EvidenceView({
  detail,
}: {
  detail: {
    case: Doc<'cases'>
    documents: Doc<'documents'>[]
    sources: Doc<'sources'>[]
  }
}) {
  const generateUploadUrl = useMutation(api.cases.generateUploadUrl)
  const attachDocument = useMutation(api.cases.attachDocument)
  const findPolicy = useAction(api.findPolicy.findPolicy)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [researching, setResearching] = useState(false)
  const [focus, setFocus] = useState('')
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    setUploading(true)
    setProgress(2)
    try {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file, setProgress)
      await attachDocument({ caseId: detail.case._id, storageId, fileName: file.name })
      setProgress(100)
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const research = async () => {
    setError('')
    setResearching(true)
    try {
      await findPolicy({ caseId: detail.case._id, focus: focus || undefined })
      setFocus('')
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setResearching(false)
    }
  }

  const policySources = detail.sources.filter((source) => source.kind === 'policy')
  const documentSources = detail.sources.filter((source) => source.kind === 'document')

  return (
    <div className="evidence-layout">
      <section className="document-column">
        <div className="section-heading">
          <div><p className="kicker">Exhibit A</p><h2>Case documents</h2></div>
          <button
            className="secondary-action"
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading ? `Uploading ${progress}%` : 'Add sample document'}
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept=".pdf,.doc,.docx,.html,.csv,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </div>
        {uploading && (
          <div className="upload-progress" aria-live="polite">
            <span style={{ transform: `scaleX(${progress / 100})` }} />
            <p><strong>{progress < 100 ? 'Moving the sample into its case file…' : 'Document attached.'}</strong><em>{progress}%</em></p>
          </div>
        )}
        {detail.documents.length === 0 ? (
          <>
            <button className="document-drop" type="button" onClick={() => fileInput.current?.click()}>
              <span className="document-corner" />
              <strong>Place the denial letter here.</strong>
              <small>Choose a fake or de-identified sample · 25 MB maximum</small>
              <span>PDF / DOCX / TXT / HTML / CSV</span>
            </button>
            <a
              className="sample-download"
              href="/samples/sample-denial.html"
              download="backstop-fictional-denial.html"
            >
              Download the fictional demo letter ↘
            </a>
          </>
        ) : (
          <div className="document-grid">
            {detail.documents.map((document, index) => (
              <article className="document-tile" key={document._id}>
                <div className="document-preview" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <i /><i /><i /><i />
                  <b>{document.fileName.split('.').pop()?.toUpperCase()}</b>
                </div>
                <div>
                  <strong>{document.fileName}</strong>
                  <span className={`document-status status-${document.status}`}>
                    {document.status === 'parsing' ? 'Reading now' : document.status}
                  </span>
                  <small>{(document.size / 1024).toFixed(0)} KB · {formatDate(document.createdAt)}</small>
                  {document.error && <p className="inline-error">{document.error}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
        {documentSources.map((source) => (
          <details className="extracted-source" key={source._id}>
            <summary>
              <span>Parsed text</span>
              <strong>{source.title}</strong>
              <em>Open excerpt</em>
            </summary>
            <p>{source.excerpt}</p>
          </details>
        ))}
      </section>

      <section className="policy-column">
        <div className="section-heading">
          <div><p className="kicker">Exhibits B–{String.fromCharCode(66 + Math.max(policySources.length - 1, 0))}</p><h2>Policy sources</h2></div>
          <span>{policySources.length} verified URLs</span>
        </div>
        {documentSources.length > 0 && policySources.length === 0 && (
          <div className="research-control">
            <label>
              <span>Optional search focus</span>
              <textarea
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                maxLength={300}
                placeholder="Example: medical necessity criteria for outpatient imaging"
              />
            </label>
            <button className="primary-action" type="button" onClick={() => void research()} disabled={researching}>
              {researching ? 'Searching public policy…' : 'Find policy sources'}
            </button>
            <p>Firecrawl search results are stored with their URL and retrieval time.</p>
          </div>
        )}
        {policySources.length === 0 && documentSources.length === 0 && (
          <div className="quiet-empty">
            <span>Source register pending</span>
            <p>Add the denial first. Policy research begins from the letter’s actual language.</p>
          </div>
        )}
        <div className="source-stack">
          {policySources.map((source, index) => (
            <article className="source-sheet" id={`source-${source._id}`} key={source._id}>
              <div className="source-number">[{index + 1}]</div>
              <div>
                <p className="source-publisher">{source.publisher ?? 'Public policy source'}</p>
                <h3>{source.title}</h3>
                <blockquote>“{source.quotedText ?? source.excerpt}”</blockquote>
                <div className="source-meta">
                  {source.url ? <a href={source.url} target="_blank" rel="noreferrer">View original ↗</a> : <span>Uploaded document</span>}
                  <time>Retrieved {formatDate(source.retrievedAt)}</time>
                </div>
              </div>
            </article>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (value: number) => void,
): Promise<Id<'_storage'>> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', uploadUrl)
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.max(2, Math.round((event.loaded / event.total) * 92)))
    }
    request.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'))
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error('The sample document could not be stored. Try a supported file under 25 MB.'))
        return
      }
      try {
        const response = JSON.parse(request.responseText) as { storageId?: Id<'_storage'> }
        if (!response.storageId) throw new Error('Upload response omitted its storage ID')
        onProgress(96)
        resolve(response.storageId)
      } catch {
        reject(new Error('The upload finished, but its storage receipt was invalid. Please try again.'))
      }
    }
    request.send(file)
  })
}

function AppealView({
  detail,
}: {
  detail: {
    case: Doc<'cases'>
    drafts: Doc<'drafts'>[]
    sources: Doc<'sources'>[]
  }
}) {
  const draftAppeal = useAction(api.draftAppeal.draftAppeal)
  const editDraft = useMutation(api.cases.editDraft)
  const approveDraft = useMutation(api.cases.approveDraft)
  const rejectDraft = useMutation(api.cases.rejectDraft)
  const latest = detail.drafts[0]
  const [instructions, setInstructions] = useState('')
  const [subject, setSubject] = useState(latest?.subject ?? '')
  const [paragraphs, setParagraphs] = useState<DraftParagraph[]>(latest?.paragraphs ?? [])
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const sourceNumbers = useMemo(
    () => new Map(detail.sources.map((source, index) => [source._id, index + 1])),
    [detail.sources],
  )

  const run = async (label: string, work: () => Promise<unknown>) => {
    setError('')
    setBusy(label)
    try {
      await work()
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setBusy('')
    }
  }

  if (!latest || latest.status === 'rejected') {
    return (
      <div className="draft-empty">
        <div>
          <p className="kicker">Appeal desk / grounded generation</p>
          <h2>{latest?.status === 'rejected' ? 'Prepare a considered revision.' : 'Turn evidence into an argument.'}</h2>
          <p>
            The draft will use only sources in this case. Any unsupported paragraph
            is labeled <strong>[UNVERIFIED]</strong> before you see it.
          </p>
        </div>
        <div className="draft-instructions">
          {latest?.rejectionReason && (
            <div className="rejection-note">
              <span>Previous review note</span>
              <p>{latest.rejectionReason}</p>
            </div>
          )}
          <label>
            <span>Optional note to the drafter</span>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              maxLength={2000}
              placeholder="Emphasize the plan’s medical-necessity criteria and ask for a written explanation."
            />
          </label>
          <button
            className="primary-action"
            type="button"
            disabled={Boolean(busy) || detail.sources.length === 0}
            onClick={() => void run('draft', () => draftAppeal({ caseId: detail.case._id, instructions: instructions || undefined }))}
          >
            {busy === 'draft' ? 'Drafting from cited evidence…' : 'Draft grounded appeal'}
          </button>
          {detail.sources.length === 0 && <p className="field-help">Add and parse a sample denial before drafting.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </div>
    )
  }

  const canReview = latest.status === 'pending_approval'
  const canSend = Boolean(detail.case.counterpartyName && detail.case.counterpartyEmail)

  return (
    <div className="appeal-layout">
      <article className="appeal-paper">
        <div className="paper-folio">
          <span>Draft appeal / {latest.status.replaceAll('_', ' ')}</span>
          <span>{formatDate(latest.updatedAt)} · Pg. 01</span>
        </div>
        <label className="subject-line">
          <span>Subject</span>
          {editing ? (
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} />
          ) : (
            <strong>{latest.subject}</strong>
          )}
        </label>
        <div className="letter-address">
          <span>To</span>
          <p><strong>{detail.case.counterpartyName}</strong><br />{detail.case.counterpartyEmail}</p>
        </div>
        <div className="draft-body">
          {paragraphs.map((paragraph, index) => (
            <div className={`draft-paragraph ${paragraph.verification}`} key={`${latest._id}-${index}`}>
              {editing ? (
                <textarea
                  value={paragraph.text}
                  aria-label={`Paragraph ${index + 1}`}
                  onChange={(event) => setParagraphs((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, text: event.target.value } : item,
                    ),
                  )}
                />
              ) : (
                <p>{paragraph.text}</p>
              )}
              <aside aria-label={`Citations for paragraph ${index + 1}`}>
                {paragraph.verification === 'unverified' ? (
                  <span className="unverified-tag">Unverified claim</span>
                ) : (
                  paragraph.sourceIds.map((sourceId) => (
                    <a href={`#source-note-${sourceId}`} key={sourceId}>
                      [{sourceNumbers.get(sourceId) ?? '?'}]
                    </a>
                  ))
                )}
              </aside>
            </div>
          ))}
        </div>
        <div className="paper-signoff">
          <span>Prepared by Backstop</span>
          <p>For review by the case owner. Not legal or medical advice.</p>
        </div>
      </article>

      <aside className="review-margin">
        <div className="review-status">
          <span>Review state</span>
          <strong>{statusCopy[detail.case.status]}</strong>
          <p>
            {canReview
              ? 'Nothing leaves Backstop until you approve this exact draft.'
              : 'This version is locked because its review state has changed.'}
          </p>
        </div>
        {canReview && (
          <div className="review-actions">
            {editing ? (
              <>
                <button
                  className="primary-action"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void run('save', async () => {
                    await editDraft({ draftId: latest._id, subject, paragraphs })
                    setEditing(false)
                  })}
                >
                  {busy === 'save' ? 'Saving exact draft…' : 'Save draft changes'}
                </button>
                <button className="text-button" type="button" onClick={() => {
                  setSubject(latest.subject)
                  setParagraphs(latest.paragraphs)
                  setEditing(false)
                }}>Discard edits</button>
              </>
            ) : (
              <>
                <button
                  className="approve-action"
                  type="button"
                  disabled={Boolean(busy) || !canSend}
                  onClick={() => void run('approve', () => approveDraft({ draftId: latest._id }))}
                >
                  {busy === 'approve' ? 'Recording approval…' : 'Approve and send appeal'}
                </button>
                <button className="secondary-action" type="button" onClick={() => setEditing(true)}>
                  Edit exact language
                </button>
                <button className="reject-action" type="button" onClick={() => setRejecting(true)}>
                  Reject draft
                </button>
              </>
            )}
            {!canSend && <p className="form-error">Payer name and email are required before approval.</p>}
          </div>
        )}
        {rejecting && (
          <form
            className="reject-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run('reject', async () => {
                await rejectDraft({ draftId: latest._id, reason })
                setRejecting(false)
              })
            }}
          >
            <label>
              <span>Why should this be redrafted?</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required />
            </label>
            <button className="reject-action" type="submit" disabled={Boolean(busy)}>
              {busy === 'reject' ? 'Recording rejection…' : 'Reject and return to drafting'}
            </button>
            <button className="text-button" type="button" onClick={() => setRejecting(false)}>Keep reviewing</button>
          </form>
        )}
        <div className="citation-register">
          <span>Citation notes</span>
          {detail.sources.map((source, index) => (
            <div id={`source-note-${source._id}`} key={source._id}>
              <b>[{index + 1}]</b>
              <p><strong>{source.title}</strong>{source.excerpt.slice(0, 170)}{source.excerpt.length > 170 ? '…' : ''}</p>
            </div>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </aside>
    </div>
  )
}

function EmailView({
  detail,
  thread,
}: {
  detail: { case: Doc<'cases'>; messages: Doc<'messages'>[] }
  thread: unknown[] | undefined
}) {
  const messages = [...detail.messages].sort((a, b) => a.createdAt - b.createdAt)
  return (
    <div className="email-layout">
      <header className="thread-header">
        <div>
          <p className="kicker">Correspondence / immutable copy</p>
          <h2>{messages[0]?.subject ?? `Appeal to ${detail.case.counterpartyName}`}</h2>
        </div>
        <dl>
          <div><dt>From</dt><dd>{detail.case.agentMailInboxEmail ?? 'Created after approval'}</dd></div>
          <div><dt>To</dt><dd>{detail.case.counterpartyEmail}</dd></div>
          <div><dt>Messages</dt><dd>{messages.length}</dd></div>
        </dl>
      </header>
      {messages.length === 0 ? (
        <div className="thread-empty">
          <span className="envelope-mark" aria-hidden="true">↗</span>
          <h3>The correspondence file is quiet.</h3>
          <p>After you approve an appeal, the sent copy and any verified reply appear here automatically.</p>
        </div>
      ) : (
        <div className="message-thread">
          {messages.map((message, index) => (
            <article className={`message ${message.direction}`} key={message._id}>
              <div className="message-meta">
                <Mark name={message.direction === 'outbound' ? 'Backstop' : message.from ?? 'Payer'} />
                <p>
                  <strong>{message.direction === 'outbound' ? 'You, via Backstop' : message.from ?? detail.case.counterpartyName}</strong>
                  <span>{message.direction === 'outbound' ? `to ${message.to}` : `to ${message.to ?? 'your case inbox'}`}</span>
                </p>
                <time>{formatDate(message.createdAt, true)}</time>
                <span className="message-number">No. {String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{message.subject ?? 'Re: appeal'}</h3>
              <div className="message-body">{message.body}</div>
              <footer><span>{message.status}</span><span>{message.channel}</span></footer>
            </article>
          ))}
        </div>
      )}
      {thread === undefined && detail.case.agentMailInboxId && (
        <p className="thread-sync" aria-live="polite">Checking the verified inbox…</p>
      )}
    </div>
  )
}

function AuditView({ audit }: { audit: Doc<'auditLog'>[] }) {
  return (
    <div className="audit-layout">
      <header>
        <p className="kicker">Provenance / append-only record</p>
        <h2>Everything consequential, in order.</h2>
        <p>External work, review decisions, and state changes remain visible here.</p>
      </header>
      {audit.length === 0 ? (
        <div className="quiet-empty"><span>Record not started</span><p>The first case action will appear here.</p></div>
      ) : (
        <ol className="audit-timeline">
          {audit.map((entry, index) => (
            <li key={entry._id}>
              <div className="audit-sequence">{String(audit.length - index).padStart(3, '0')}</div>
              <Mark name={entry.actor} />
              <div className="audit-copy">
                <p><span>{entry.actor}</span><time>{formatDate(entry.createdAt, true)}</time></p>
                <h3>{humanizeEvent(entry.event)}</h3>
                <p>{entry.detail}</p>
                <small>Operation {entry.operationId}</small>
              </div>
              <span className={`audit-status ${entry.status}`}>{entry.status}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function humanizeEvent(event: string) {
  return event
    .replace(/^external\./, '')
    .replaceAll('.', ' · ')
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function CaseSkeleton({ onBoard }: { onBoard: () => void }) {
  return (
    <section className="case-loading" aria-live="polite">
      <button className="back-button" type="button" onClick={onBoard}>← All cases</button>
      <span className="skeleton short" />
      <span className="skeleton headline" />
      <div className="skeleton-rule" />
      <span className="skeleton body" />
      <p>Opening the live case record…</p>
    </section>
  )
}

export default App
