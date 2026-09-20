import { useAuthActions } from '@convex-dev/auth/react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../convex/_generated/api'
import { denialHighlightSegments } from '../convex/researchHelpers'
import type { Doc, Id } from '../convex/_generated/dataModel'
import './App.css'
import './awesomic.css'
import './depth.css'
import { AuthGate } from './AuthGate'
import { BrandMark } from './BrandMark'

type CaseTab = 'case' | 'evidence' | 'appeal' | 'email' | 'record' | 'watch'
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

function daysUntilDeadline(deadlineAt: number, now = Date.now()) {
  return Math.ceil((deadlineAt - now) / 86_400_000)
}

function deadlineLabel(deadlineAt: number | undefined, now = Date.now()) {
  if (!deadlineAt) return { text: 'No deadline', urgency: 'none' as const }
  const days = daysUntilDeadline(deadlineAt, now)
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgency: 'overdue' as const }
  if (days === 0) return { text: 'Due today', urgency: 'soon' as const }
  if (days <= 7) return { text: `${days}d left`, urgency: 'soon' as const }
  return { text: `${days}d left`, urgency: 'ok' as const }
}

function boardCaseRank(status: Doc<'cases'>['status'], title: string) {
  if (isDemoBoardFiller(title)) return 5
  if (status === 'awaiting_approval') return 0
  if (status === 'error') return 1
  if (status === 'drafting' || status === 'researching' || status === 'parsing') return 2
  return 3
}

function sortBoardCases(cases: Doc<'cases'>[]) {
  return [...cases].sort((a, b) => {
    const rank = boardCaseRank(a.status, a.title) - boardCaseRank(b.status, b.title)
    if (rank !== 0) return rank
    const deadlineA = a.deadlineAt ?? Number.MAX_SAFE_INTEGER
    const deadlineB = b.deadlineAt ?? Number.MAX_SAFE_INTEGER
    if (deadlineA !== deadlineB) return deadlineA - deadlineB
    return b.updatedAt - a.updatedAt
  })
}

function documentKindLabel(kind: Doc<'documents'>['kind'] | undefined, fileName: string) {
  if (kind === 'denial_letter') return 'Denial letter'
  if (kind === 'eob') return 'EOB'
  if (kind === 'bill') return 'Bill'
  if (kind === 'policy') return 'Policy file'
  if (/eob/i.test(fileName)) return 'EOB'
  if (/denial/i.test(fileName)) return 'Denial letter'
  return 'Document'
}

function isDemoBoardFiller(title: string) {
  return title.startsWith('Demo board —')
}

/** Document sources first, then policy — shared numbering for Evidence + Appeal. */
function orderedSources(sources: Doc<'sources'>[]) {
  const documents = sources.filter((source) => source.kind === 'document')
  const policy = sources.filter((source) => source.kind === 'policy')
  const other = sources.filter((source) => source.kind !== 'document' && source.kind !== 'policy')
  return [...documents, ...policy, ...other]
}

function sourceNumberMap(sources: Doc<'sources'>[]) {
  return new Map(orderedSources(sources).map((source, index) => [source._id, index + 1]))
}

function displayParagraphText(text: string) {
  return text.replace(/^\[UNVERIFIED\]\s*/i, '').trim()
}

function humanizeEvent(event: string) {
  return event
    .replace(/^external\./, '')
    .replaceAll('.', ' · ')
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function describeAuditEvent(event: string): { vendor: string; title: string } {
  const map: Record<string, { vendor: string; title: string }> = {
    'case.created': { vendor: 'You', title: 'Case opened' },
    'demo.deadline_set': { vendor: 'System', title: 'Demo deadline set' },
    'document.attached': { vendor: 'You', title: 'Document attached' },
    'draft.approved': { vendor: 'You', title: 'Draft approved' },
    'draft.edited': { vendor: 'You', title: 'Draft edited' },
    'draft.rejected': { vendor: 'You', title: 'Draft rejected' },
    'external.firecrawl.parse': { vendor: 'Firecrawl', title: 'Document parsed' },
    'external.firecrawl.policy_research': { vendor: 'Firecrawl', title: 'Policy researched' },
    'external.firecrawl.monitor': { vendor: 'Firecrawl', title: 'Page monitored' },
    'external.firecrawl.interact': { vendor: 'Firecrawl', title: 'Public form filled' },
    'external.openai.draft_appeal': { vendor: 'OpenAI', title: 'Appeal drafted' },
    'external.agentmail.send_queued': { vendor: 'AgentMail', title: 'Send queued' },
    'external.agentmail.send': { vendor: 'AgentMail', title: 'Message sent' },
    'external.agentmail.inbound_received': { vendor: 'AgentMail', title: 'Inbound received' },
    'demo.inbound_simulated': { vendor: 'Demo', title: 'Fictional reply injected' },
  }
  if (map[event]) return map[event]
  if (event.startsWith('external.firecrawl')) {
    return { vendor: 'Firecrawl', title: humanizeEvent(event) }
  }
  if (event.startsWith('external.openai')) {
    return { vendor: 'OpenAI', title: humanizeEvent(event) }
  }
  if (event.startsWith('external.agentmail')) {
    return { vendor: 'AgentMail', title: humanizeEvent(event) }
  }
  if (event.startsWith('demo.')) {
    return { vendor: 'Demo', title: humanizeEvent(event) }
  }
  if (event.startsWith('draft.') || event.startsWith('case.') || event.startsWith('document.')) {
    return { vendor: 'You', title: humanizeEvent(event) }
  }
  return { vendor: 'System', title: humanizeEvent(event) }
}

function highlightCitationNote(sourceId: string) {
  const note = document.getElementById(`source-note-${sourceId}`)
  if (!note) return
  note.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  note.classList.remove('is-flash')
  void note.offsetWidth
  note.classList.add('is-flash')
  window.setTimeout(() => note.classList.remove('is-flash'), 1600)
}

function Mark({ name }: { name: string }) {
  if (name === 'B' || name === 'Backstop') {
    return <BrandMark size={26} />
  }
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
  const [creating, setCreating] = useState<false | 'sample' | 'upload'>(false)
  const [openTab, setOpenTab] = useState<CaseTab | null>(null)

  const openCase = (caseId: Id<'cases'>, opts?: { focusEvidence?: boolean }) => {
    setSelectedCaseId(caseId)
    setCreating(false)
    setOpenTab(opts?.focusEvidence ? 'evidence' : null)
  }

  return (
    <div className="product-shell product-shell-depth">
      <div className="product-atmosphere" aria-hidden="true" />
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
          Drafts and sends the appeals you approve. Not legal or medical advice.
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
            mode={creating === 'upload' ? 'upload' : 'sample'}
          />
        ) : selectedCaseId ? (
          <CaseWorkspace
            key={selectedCaseId}
            caseId={selectedCaseId}
            cases={cases ?? []}
            onSelect={(id) => openCase(id)}
            onNew={() => setCreating('sample')}
            onBoard={() => {
              setSelectedCaseId(null)
              setOpenTab(null)
            }}
            initialTab={openTab ?? undefined}
          />
        ) : (
          <CaseBoard
            cases={cases}
            onSelect={openCase}
            onNew={() => setCreating('sample')}
            onUpload={() => setCreating('upload')}
          />
        )}
      </main>

      <footer className="product-footer product-footer-depth">
        <div className="product-footer-brand">
          <Mark name="B" />
          <div>
            <strong>backstop*</strong>
            <span>Medical-denial advocacy</span>
          </div>
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
  onUpload,
}: {
  cases: Doc<'cases'>[] | undefined
  onSelect: (id: Id<'cases'>) => void
  onNew: () => void
  onUpload: () => void
}) {
  if (cases === undefined) {
    return <BoardSkeleton />
  }

  const ordered = sortBoardCases(cases).filter((item) => !isDemoBoardFiller(item.title))
  const needsReview = ordered.filter((item) => item.status === 'awaiting_approval')

  return (
    <section className="board page-enter board-depth" aria-labelledby="board-title">
      <div className="board-atmosphere" aria-hidden="true" />
      <div className="board-canvas">
        <header className="board-toolbar">
          <div>
            <p className="kicker">Your workspace</p>
            <h1 id="board-title">A clear next step.</h1>
            <p className="board-lede">
              Open a sample denial case, or upload your own sample file. Everything after that stays on this board.
            </p>
          </div>
          <div className="board-toolbar-actions">
            <button className="primary-action" type="button" onClick={onNew}>
              Start a sample case
            </button>
            <button className="secondary-action" type="button" onClick={onUpload}>
              Upload a denial file
            </button>
          </div>
        </header>

        {needsReview.length > 0 && (
          <div className="board-queue" role="status">
            <p className="props-label">Needs your review</p>
            <strong>
              {needsReview.length} {needsReview.length === 1 ? 'case' : 'cases'} waiting for approval
            </strong>
            <button
              className="secondary-action"
              type="button"
              onClick={() => onSelect(needsReview[0]._id)}
            >
              Open next →
            </button>
          </div>
        )}

        <div className="board-register">
          <div className="register-heading">
            <span>Cases</span>
            <span>{String(ordered.length).padStart(2, '0')}</span>
          </div>
          {ordered.length === 0 ? (
            <div className="empty-register">
              <div className="empty-visual" aria-hidden="true">
                <BrandMark size={42} />
              </div>
              <h2>No case file yet</h2>
              <p>
                Start with a fictional denial packet, or upload your own sample denial file.
              </p>
              <div className="empty-register-actions">
                <button className="secondary-action" type="button" onClick={onNew}>
                  Create your first case
                </button>
                <button className="text-button" type="button" onClick={onUpload}>
                  Upload a denial file
                </button>
              </div>
            </div>
          ) : (
            <ol className="case-list">
              {ordered.map((item, index) => {
                const deadline = deadlineLabel(item.deadlineAt)
                return (
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
                      <span className={`case-deadline urgency-${deadline.urgency}`}>
                        {deadline.text}
                      </span>
                      <span className="arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

function BoardSkeleton() {
  return (
    <section className="board board-loading" aria-live="polite" aria-label="Loading cases">
      <div className="board-canvas">
        <div className="board-toolbar">
          <div>
            <span className="skeleton short" />
            <span className="skeleton headline" />
            <span className="skeleton body" />
          </div>
        </div>
        <div className="board-register">
          {[1, 2, 3].map((item) => <span className="skeleton row" key={item} />)}
        </div>
      </div>
    </section>
  )
}

function Intake({
  onCancel,
  onCreated,
  mode = 'sample',
}: {
  onCancel: () => void
  onCreated: (id: Id<'cases'>, opts?: { focusEvidence?: boolean }) => void
  mode?: 'sample' | 'upload'
}) {
  const createCase = useMutation(api.cases.createCase)
  const seedSamplePacket = useAction(api.sampleDenial.seedSamplePacket)
  const [title, setTitle] = useState(
    mode === 'upload' ? 'Uploaded denial sample' : 'Sample denial - outpatient MRI',
  )
  const [payer, setPayer] = useState('Aetna (fictional demo)')
  const [email, setEmail] = useState('appeals@example.com')
  const [deadline, setDeadline] = useState(() => {
    const day = new Date()
    day.setDate(day.getDate() + 14)
    return day.toISOString().slice(0, 10)
  })
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
      if (mode === 'sample') {
        await seedSamplePacket({ caseId })
        onCreated(caseId)
      } else {
        onCreated(caseId, { focusEvidence: true })
      }
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="intake page-enter intake-depth" aria-labelledby="intake-title">
      <div className="intake-atmosphere" aria-hidden="true" />
      <div className="intake-shell">
        <button className="back-button" type="button" onClick={onCancel}>
          ← Cases
        </button>

        <div className="intake-card">
          <header className="intake-card-head">
            <p className="kicker">New case</p>
            <h1 id="intake-title">
              {mode === 'upload' ? 'Upload a sample denial.' : 'Begin with the envelope.'}
            </h1>
            <p className="intake-lede">
              {mode === 'upload'
                ? 'Create the case, then attach your own fictional or de-identified sample file on Evidence. Parse → research → draft still runs. You still approve before anything is sent.'
                : 'Who issued the denial? Opening the case attaches a fictional denial letter and EOB, then starts parse → research → draft. You still approve before anything is sent.'}
            </p>
          </header>

          <form className="intake-form" onSubmit={(event) => void submit(event)}>
            <label>
              <span>Case title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={160}
                required
              />
              <small>Use a recognizable label. Never a real patient name.</small>
            </label>
            <div className="field-pair">
              <label>
                <span>Payer name</span>
                <input
                  value={payer}
                  onChange={(event) => setPayer(event.target.value)}
                  maxLength={160}
                  required
                />
              </label>
              <label>
                <span>Appeal email</span>
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
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions">
              <button
                className="primary-action"
                type="submit"
                disabled={busy}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  event.currentTarget.style.setProperty(
                    '--mx',
                    `${((event.clientX - rect.left) / rect.width) * 100}%`,
                  )
                  event.currentTarget.style.setProperty(
                    '--my',
                    `${((event.clientY - rect.top) / rect.height) * 100}%`,
                  )
                }}
              >
                <span className="btn-shine" aria-hidden="true" />
                {busy
                  ? mode === 'upload'
                    ? 'Opening case…'
                    : 'Attaching sample packet…'
                  : mode === 'upload'
                    ? 'Create case and open Evidence'
                    : 'Open case file'}
              </button>
              <button className="text-button" type="button" onClick={onCancel}>
                Cancel
              </button>
            </div>
            <p className="field-help">
              Demo only. Not HIPAA compliant. Fictional or de-identified files only.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

function CaseWorkspace({
  caseId,
  cases,
  onSelect,
  onNew,
  onBoard,
  initialTab,
}: {
  caseId: Id<'cases'>
  cases: Doc<'cases'>[]
  onSelect: (id: Id<'cases'>) => void
  onNew: () => void
  onBoard: () => void
  initialTab?: CaseTab
}) {
  const detail = useQuery(api.cases.getCase, { caseId })
  const thread = useQuery(api.email.listThread, { caseId })
  const [tab, setTab] = useState<CaseTab>(initialTab ?? 'case')

  if (detail === undefined) return <CaseSkeleton onBoard={onBoard} />
  if (detail === null) {
    return (
      <section className="not-found">
        <p className="kicker">Case unavailable</p>
        <h1>This case is no longer in your record.</h1>
        <button className="primary-action" type="button" onClick={onBoard}>Return to case board</button>
      </section>
    )
  }

  return (
    <section
      className={`case-workspace page-enter workspace-depth${tab === 'appeal' ? ' is-appeal' : ''}`}
    >
      <div className="workspace-atmosphere" aria-hidden="true" />
      <aside className="case-rail" aria-label="Case navigation">
        <button className="back-button" type="button" onClick={onBoard}>← All cases</button>
        <p className="rail-label">Cases</p>
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
            ['watch', `Watch ${detail.monitors.length}`],
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
              setTab={setTab}
            />
          )}
          {tab === 'email' && <EmailView detail={detail} thread={thread} setTab={setTab} />}
          {tab === 'watch' && <WatchView detail={detail} />}
          {tab === 'record' && <AuditView audit={detail.audit} />}
        </div>
      </div>

      {tab !== 'appeal' && (
        <CaseProperties detail={detail} setTab={setTab} />
      )}
    </section>
  )
}

function CaseHeader({ caseRow }: { caseRow: Doc<'cases'> }) {
  return (
    <header className="case-header">
      <div className="case-heading">
        <p className="kicker">{statusCopy[caseRow.status]}</p>
        <h1>{caseRow.title}</h1>
      </div>
    </header>
  )
}

function CaseProperties({
  detail,
  setTab,
}: {
  detail: NonNullable<ReturnType<typeof useQuery<typeof api.cases.getCase>>>
  setTab: (tab: CaseTab) => void
}) {
  const caseRow = detail.case
  const activeIndex = Math.max(
    0,
    workflow.findIndex((step) => step.statuses.includes(caseRow.status)),
  )
  const next = getNextStep(detail)
  const latestDraft = detail.drafts[0]

  return (
    <aside className="case-props" aria-label="Case properties">
      <p className="props-label">Properties</p>

      <dl className="props-facts">
        <div>
          <dt>Status</dt>
          <dd>{statusCopy[caseRow.status]}</dd>
        </div>
        <div>
          <dt>Payer</dt>
          <dd>{caseRow.counterpartyName ?? 'Not provided'}</dd>
        </div>
        <div>
          <dt>Appeal email</dt>
          <dd>{caseRow.counterpartyEmail ?? 'Not provided'}</dd>
        </div>
        <div>
          <dt>Opened</dt>
          <dd>{formatDate(caseRow.createdAt)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{caseRow.deadlineAt ? formatDate(caseRow.deadlineAt) : 'No date set'}</dd>
        </div>
      </dl>

      <div className="props-block">
        <p className="props-label">Counts</p>
        <ul className="props-counts">
          <li><span>Documents</span><strong>{detail.documents.length}</strong></li>
          <li><span>Policy sources</span><strong>{detail.sources.filter((s) => s.kind === 'policy').length}</strong></li>
          <li><span>Cited claims</span><strong>{latestDraft?.paragraphs.filter((p) => p.verification === 'cited').length ?? 0}</strong></li>
          <li><span>Messages</span><strong>{detail.messages.length}</strong></li>
        </ul>
      </div>

      <div className="props-block">
        <p className="props-label">Workflow</p>
        <ol className="props-workflow" aria-label={`Current status: ${statusCopy[caseRow.status]}`}>
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
      </div>

      <div className="props-next">
        <p className="props-label">Next</p>
        <p className="props-next-title">{next.title}</p>
        <button className="secondary-action" type="button" onClick={() => setTab(next.tab)}>
          {next.action} →
        </button>
      </div>
    </aside>
  )
}

function CaseOverview({
  detail,
  setTab,
}: {
  detail: NonNullable<ReturnType<typeof useQuery<typeof api.cases.getCase>>>
  setTab: (tab: CaseTab) => void
}) {
  const next = getNextStep(detail)
  return (
    <div className="overview-grid overview-depth">
      <section className="next-step" aria-labelledby="next-title">
        <p className="kicker">Next action</p>
        <h2 id="next-title">{next.title}</h2>
        <p>{next.copy}</p>
        <button className="primary-action" type="button" onClick={() => setTab(next.tab)}>
          {next.action} <span aria-hidden="true">→</span>
        </button>
      </section>
      <section className="recent-record">
        <div className="section-heading">
          <h3>Recent record</h3>
          <button type="button" onClick={() => setTab('record')}>Full timeline</button>
        </div>
        {detail.audit.slice(0, 6).map((entry) => (
          <div className="record-line" key={entry._id}>
            <Mark name={entry.actor} />
            <p><strong>{describeAuditEvent(entry.event).title}</strong><span>{entry.detail}</span></p>
            <time>{formatDate(entry.createdAt, true)}</time>
          </div>
        ))}
        {detail.audit.length === 0 && (
          <p className="empty-hint">Actions on this case will appear here as an audit trail.</p>
        )}
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
    return { title: 'Add the sample denial packet.', copy: 'A fictional denial letter and EOB, or your own sample PDF/Word/HTML/CSV/text. Backstop creates evidence sources from them.', action: 'Add documents', tab: 'evidence' as const }
  }
  if (detail.documents.some((document) => document.status === 'parsing') || detail.case.status === 'parsing') {
    return { title: 'The letter is being read.', copy: 'This page updates live. You can stay here while the document becomes a cited source.', action: 'Watch evidence', tab: 'evidence' as const }
  }
  if (detail.case.status === 'researching') {
    return { title: 'Finding public policy.', copy: 'Firecrawl is searching and scraping official policy pages from the denial language. This updates live. No manual step needed.', action: 'Watch evidence', tab: 'evidence' as const }
  }
  if (!detail.sources.some((source) => source.kind === 'policy')) {
    return { title: 'Find the policy behind the denial.', copy: detail.case.status === 'error' ? 'Automatic research did not finish. Retry policy search or continue with the letter alone.' : 'Search public policy material and keep every retrieved clause attached to this case.', action: 'Research policy', tab: 'evidence' as const }
  }
  if (detail.case.status === 'drafting' || (!detail.drafts.length && detail.sources.length > 0)) {
    return { title: 'Drafting your appeal.', copy: 'OpenAI is building a cited draft from stored evidence. Approve remains the only send gate.', action: 'Watch appeal', tab: 'appeal' as const }
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
  const seedSamplePacket = useAction(api.sampleDenial.seedSamplePacket)
  const findPolicy = useAction(api.findPolicy.findPolicy)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [researching, setResearching] = useState(false)
  const [seeding, setSeeding] = useState(false)
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

  const seedDemo = async () => {
    setError('')
    setSeeding(true)
    try {
      await seedSamplePacket({ caseId: detail.case._id })
    } catch (caught) {
      setError(readableError(caught))
    } finally {
      setSeeding(false)
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
  const numbers = sourceNumberMap(detail.sources)

  return (
    <div className="evidence-layout evidence-depth">
      <section className="document-column">
        <div className="section-heading">
          <div><p className="kicker">Documents</p><h2>Case documents</h2></div>
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
            <button
              className="document-drop"
              type="button"
              onClick={() => void seedDemo()}
              disabled={seeding || uploading}
            >
              <span className="document-corner" />
              <strong>
                {seeding ? 'Attaching the demo packet…' : 'Use the fictional demo packet'}
              </strong>
              <small>Attaches denial + EOB and starts parse → research → draft</small>
              <span>Two files · no real PHI</span>
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || seeding}
            >
              Or upload a different sample file
            </button>
            <a
              className="sample-download"
              href="/samples/sample-denial.html"
              download="backstop-fictional-denial.html"
            >
              Preview denial letter ↘
            </a>
            <a
              className="sample-download"
              href="/samples/sample-eob.html"
              download="backstop-fictional-eob.html"
            >
              Preview sample EOB ↘
            </a>
            <a
              className="sample-download"
              href="/samples/messy-denial-scan.txt"
              download="backstop-messy-denial-scan.txt"
            >
              Messy fax-style sample ↘
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
                  <span className="document-kind">{documentKindLabel(document.kind, document.fileName)}</span>
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
          <details className="extracted-source" id={`source-${source._id}`} key={source._id}>
            <summary>
              <span>[{numbers.get(source._id) ?? '?'}] Parsed text</span>
              <strong>{source.title}</strong>
              <em>Open excerpt</em>
            </summary>
            <p>{source.excerpt}</p>
          </details>
        ))}
      </section>

      <section className="policy-column">
        <div className="section-heading">
          <div><p className="kicker">Policy</p><h2>Policy sources</h2></div>
          <span>{policySources.length} verified URLs</span>
        </div>
        {documentSources.length > 0 && policySources.length === 0 && detail.case.status === 'researching' && (
          <div className="quiet-empty">
            <span>Policy research running</span>
            <p>Firecrawl is searching public policy pages from the denial letter. Results appear here automatically.</p>
          </div>
        )}
        {documentSources.length > 0 && policySources.length === 0 && detail.case.status !== 'researching' && (
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
            <p>
              {detail.case.status === 'error'
                ? 'Automatic research did not finish. Retry here or continue with the letter alone.'
                : 'Firecrawl search results are stored with their URL and retrieval time.'}
            </p>
          </div>
        )}
        {policySources.length === 0 && documentSources.length === 0 && (
          <div className="quiet-empty">
            <span>Source register pending</span>
            <p>Add the denial first. Policy research begins from the letter’s actual language.</p>
          </div>
        )}
        <div className="source-stack">
          {policySources.map((source) => (
            <article className="source-sheet" id={`source-${source._id}`} key={source._id}>
              <div className="source-number">[{numbers.get(source._id) ?? '?'}]</div>
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
  setTab,
}: {
  detail: {
    case: Doc<'cases'>
    drafts: Doc<'drafts'>[]
    sources: Doc<'sources'>[]
  }
  setTab: (tab: CaseTab) => void
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
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null)

  const sourceNumbers = useMemo(() => sourceNumberMap(detail.sources), [detail.sources])
  const sourcesOrdered = useMemo(() => orderedSources(detail.sources), [detail.sources])
  const denialSources = detail.sources.filter((source) => source.kind === 'document')
  const primaryDenial =
    denialSources.find((source) => /denial/i.test(source.title)) ?? denialSources[0]
  const activeSource = activeSourceId
    ? detail.sources.find((source) => source._id === activeSourceId) ?? null
    : null

  const selectCitation = (sourceId: string, paragraphIndex?: number) => {
    setActiveSourceId(sourceId)
    if (typeof paragraphIndex === 'number') setActiveParagraph(paragraphIndex)
    highlightCitationNote(sourceId)
  }
  const isFollowUp =
    Boolean(latest) &&
    latest!.status === 'pending_approval' &&
    detail.drafts.some((draft, index) => index > 0 && (draft.status === 'sent' || draft.status === 'approved'))
  const unverifiedCount = paragraphs.filter((paragraph) => paragraph.verification === 'unverified').length

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
    const pipelineBusy =
      detail.case.status === 'parsing' ||
      detail.case.status === 'researching' ||
      detail.case.status === 'drafting'
    return (
      <div className="draft-empty">
        <div>
          <p className="kicker">Appeal desk</p>
          <h2>
            {latest?.status === 'rejected'
              ? 'Prepare a considered revision.'
              : pipelineBusy
                ? 'Working through the evidence…'
                : 'Turn evidence into an argument.'}
          </h2>
          <p>
            {pipelineBusy
              ? 'Parse, policy research, and drafting run automatically after the sample letter attaches. Stay on Evidence or wait here. Approve remains the only send gate.'
              : (
                <>
                  The draft will use only sources in this case. Any unsupported paragraph
                  is labeled <strong>unverified</strong> before you see it.
                </>
              )}
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
    <div className="appeal-layout appeal-depth">
      <div className="appeal-atmosphere" aria-hidden="true" />
      <div className="appeal-reading appeal-grounding">
        <aside className="denial-compare" aria-label="Denial letter">
          <p className="props-label">Denial</p>
          {primaryDenial ? (
            <div className="denial-compare-item">
              <p className="denial-compare-title">{primaryDenial.title}</p>
              <blockquote className="denial-full">
                {denialHighlightSegments(primaryDenial.excerpt).map((part, index) =>
                  part.hit ? (
                    <mark key={index} className="denial-hit">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={index}>{part.text}</span>
                  ),
                )}
              </blockquote>
            </div>
          ) : (
            <p className="field-help">No denial letter on this case yet.</p>
          )}
          {denialSources.length > 1 && (
            <p className="field-help">
              {denialSources.length - 1} more document
              {denialSources.length - 1 === 1 ? '' : 's'} on Evidence.
            </p>
          )}
          <button className="text-button" type="button" onClick={() => setTab('evidence')}>
            Open full evidence →
          </button>
        </aside>

        <article className="appeal-paper">
          <div className="paper-folio">
            <span>
              {isFollowUp ? 'Follow-up draft' : 'Draft appeal'} · {latest.status.replaceAll('_', ' ')}
            </span>
            <span>{formatDate(latest.updatedAt)}</span>
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
            <p>
              <strong>{detail.case.counterpartyName}</strong>
              <br />
              {detail.case.counterpartyEmail}
            </p>
          </div>
          <div className="draft-body">
            {paragraphs.map((paragraph, index) => (
              <div
                className={`draft-paragraph ${paragraph.verification}${
                  activeParagraph === index ? ' is-active' : ''
                }`}
                key={`${latest._id}-${index}`}
              >
                {editing ? (
                  <textarea
                    value={paragraph.text}
                    aria-label={`Paragraph ${index + 1}`}
                    onChange={(event) =>
                      setParagraphs((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                  />
                ) : (
                  <p>{displayParagraphText(paragraph.text)}</p>
                )}
                <aside aria-label={`Citations for paragraph ${index + 1}`}>
                  {paragraph.verification === 'unverified' ? (
                    <span className="unverified-tag">Unverified claim</span>
                  ) : (
                    paragraph.sourceIds.map((sourceId) => (
                      <button
                        type="button"
                        className={`cite-chip${activeSourceId === sourceId ? ' is-active' : ''}`}
                        key={sourceId}
                        onClick={() => selectCitation(sourceId, index)}
                      >
                        [{sourceNumbers.get(sourceId) ?? '?'}]
                      </button>
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

        <aside className="policy-proof" aria-label="Policy proof">
          <p className="props-label">Policy proof</p>
          {activeSource ? (
            <div className="policy-proof-card">
              <p className="policy-proof-kind">
                {activeSource.kind === 'policy' ? 'Insurer policy clause' : 'Case document'} · [
                {sourceNumbers.get(activeSource._id) ?? '?'}]
              </p>
              <h3>{activeSource.title}</h3>
              <blockquote>
                “{activeSource.quotedText ?? activeSource.excerpt}”
              </blockquote>
              {activeSource.verification === 'unverified' && (
                <p className="policy-proof-unverified" role="note">
                  Not a verbatim clause match. Backstop pulled this excerpt from
                  the page but could not confirm it as the relevant policy
                  language, so no claim rests on it.
                </p>
              )}
              {activeSource.retrievedAt && (
                <p className="field-help">
                  Retrieved {formatDate(activeSource.retrievedAt)}
                </p>
              )}
              {activeSource.url ? (
                <a
                  className="primary-action policy-proof-open"
                  href={activeSource.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original ↗
                </a>
              ) : (
                <p className="field-help">No live URL on this source.</p>
              )}
              {activeSource.kind !== 'policy' && (
                <p className="field-help">
                  Pick a cited policy chip in the appeal to see the insurer’s own clause.
                </p>
              )}
            </div>
          ) : (
            <div className="policy-proof-empty">
              <p>Click a citation in the appeal to see the insurer’s own clause.</p>
            </div>
          )}
        </aside>
      </div>

      <aside className="review-margin">
        <div className="review-status">
          <span>Review state</span>
          <strong>{isFollowUp ? 'Follow-up needs approval' : statusCopy[detail.case.status]}</strong>
          <p>
            {canReview
              ? isFollowUp
                ? 'A reply arrived. This follow-up still will not send until you approve it.'
                : 'Nothing leaves Backstop until you approve this exact draft.'
              : 'This version is locked because its review state has changed.'}
          </p>
          {unverifiedCount > 0 && (
            <p className="unverified-count" role="status">
              {unverifiedCount} unverified {unverifiedCount === 1 ? 'claim' : 'claims'}. Review before
              approving.
            </p>
          )}
        </div>
        {canReview && (
          <div className="review-actions">
            {editing ? (
              <>
                <button
                  className="primary-action"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void run('save', async () => {
                      await editDraft({ draftId: latest._id, subject, paragraphs })
                      setEditing(false)
                    })
                  }
                >
                  {busy === 'save' ? 'Saving exact draft…' : 'Save draft changes'}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setSubject(latest.subject)
                    setParagraphs(latest.paragraphs)
                    setEditing(false)
                  }}
                >
                  Discard edits
                </button>
              </>
            ) : (
              <>
                <button
                  className="approve-action"
                  type="button"
                  disabled={Boolean(busy) || !canSend}
                  onClick={() => void run('approve', () => approveDraft({ draftId: latest._id }))}
                >
                  {busy === 'approve'
                    ? 'Recording approval…'
                    : isFollowUp
                      ? 'Approve and send follow-up'
                      : 'Approve and send appeal'}
                </button>
                <button className="secondary-action" type="button" onClick={() => setEditing(true)}>
                  Edit exact language
                </button>
                <button className="reject-action" type="button" onClick={() => setRejecting(true)}>
                  Reject draft
                </button>
              </>
            )}
            {!canSend && (
              <p className="form-error">Payer name and email are required before approval.</p>
            )}
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
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                maxLength={500}
                required
              />
            </label>
            <button className="reject-action" type="submit" disabled={Boolean(busy)}>
              {busy === 'reject' ? 'Recording rejection…' : 'Reject and return to drafting'}
            </button>
            <button className="text-button" type="button" onClick={() => setRejecting(false)}>
              Keep reviewing
            </button>
          </form>
        )}
        <div className="citation-register">
          <span>Citation notes</span>
          {sourcesOrdered.map((source) => (
            <div
              id={`source-note-${source._id}`}
              key={source._id}
              className={activeSourceId === source._id ? 'is-active' : undefined}
            >
              <b>[{sourceNumbers.get(source._id) ?? '?'}]</b>
              <p>
                <strong>{source.title}</strong>
                {source.verification === 'unverified' && (
                  <span className="unverified-tag">Excerpt not confirmed</span>
                )}
                {source.excerpt.slice(0, 170)}
                {source.excerpt.length > 170 ? '…' : ''}
                <span className="citation-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => selectCitation(source._id)}
                  >
                    Show in proof
                  </button>
                  <button type="button" className="text-button" onClick={() => setTab('evidence')}>
                    Open in Evidence
                  </button>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      Original ↗
                    </a>
                  )}
                </span>
              </p>
            </div>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </aside>
    </div>
  )
}

function EmailView({
  detail,
  thread,
  setTab,
}: {
  detail: { case: Doc<'cases'>; messages: Doc<'messages'>[]; drafts: Doc<'drafts'>[] }
  thread: unknown[] | undefined
  setTab: (tab: CaseTab) => void
}) {
  const messages = [...detail.messages].sort((a, b) => a.createdAt - b.createdAt)
  const hasOutbound = messages.some((message) => message.direction === 'outbound')
  const hasInbound = messages.some((message) => message.direction === 'inbound')
  const latestDraft = detail.drafts[0]
  const followUpReady =
    hasInbound &&
    latestDraft?.status === 'pending_approval' &&
    detail.drafts.some((draft, index) => index > 0 && (draft.status === 'sent' || draft.status === 'approved'))
  const followUpDrafting =
    hasInbound &&
    !followUpReady &&
    (detail.case.status === 'drafting' || detail.case.status === 'awaiting_reply')

  return (
    <div className="email-layout email-depth">
      <header className="thread-header">
        <div>
          <p className="kicker">Correspondence</p>
          <h2>{messages[0]?.subject ?? `Appeal to ${detail.case.counterpartyName}`}</h2>
        </div>
        <dl>
          <div><dt>From</dt><dd>{detail.case.agentMailInboxEmail ?? 'Created after approval'}</dd></div>
          <div><dt>To</dt><dd>{detail.case.counterpartyEmail}</dd></div>
          <div><dt>Messages</dt><dd>{messages.length}</dd></div>
        </dl>
      </header>
      {followUpReady && (
        <div className="followup-banner" role="status">
          <div>
            <p className="props-label">Human gate</p>
            <strong>Follow-up draft ready</strong>
            <p>The payer reply is on file. Approve remains the only send gate.</p>
          </div>
          <button className="primary-action" type="button" onClick={() => setTab('appeal')}>
            Review &amp; approve →
          </button>
        </div>
      )}
      {!followUpReady && followUpDrafting && (
        <div className="followup-banner is-waiting" role="status">
          <div>
            <p className="props-label">OpenAI</p>
            <strong>Drafting a follow-up…</strong>
            <p>Stay here or open Appeal. It updates live when the draft is ready for your review.</p>
          </div>
          <button className="secondary-action" type="button" onClick={() => setTab('appeal')}>
            Watch Appeal →
          </button>
        </div>
      )}
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
      {hasOutbound && !hasInbound && (
        <p className="field-help">
          Inbound payer replies appear here when they arrive. Follow-ups still need your approval
          before send.
        </p>
      )}
      {thread === undefined && detail.case.agentMailInboxId && (
        <p className="thread-sync" aria-live="polite">Checking the verified inbox…</p>
      )}
    </div>
  )
}

function WatchView({
  detail,
}: {
  detail: {
    case: Doc<'cases'>
    monitors: Doc<'monitors'>[]
    drafts: Doc<'drafts'>[]
  }
}) {
  const ensureDemoDeadline = useMutation(api.cases.ensureDemoDeadline)
  const watchDeadline = useAction(api.depth.watchDeadline)
  const watchPolicy = useAction(api.depth.watchPolicy)
  const fillPublicForm = useAction(api.depth.fillPublicForm)
  const [policyUrl, setPolicyUrl] = useState(
    'https://www.medicare.gov/claims-appeals/file-an-appeal',
  )
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const formDrafts = detail.drafts.filter((draft) => draft.kind === 'form_submission')

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

  return (
    <div className="overview-grid watch-depth">
      <section className="next-step">
        <p className="kicker">Watch</p>
        <h2>Watch the deadline.</h2>
        <p>
          Watch the appeal deadline and a public policy page. Changes surface here
          and in the record. Nothing is submitted for you.
        </p>
        <div className="review-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('deadline', async () => {
                await ensureDemoDeadline({ caseId: detail.case._id })
                await watchDeadline({ caseId: detail.case._id })
              })
            }
          >
            {busy === 'deadline' ? 'Arming deadline watch…' : 'Watch this deadline'}
          </button>
        </div>
        <label>
          <span>Public policy / form URL</span>
          <input
            value={policyUrl}
            onChange={(event) => setPolicyUrl(event.target.value)}
            placeholder="https://"
          />
        </label>
        <button
          className="secondary-action"
          type="button"
          disabled={Boolean(busy) || !policyUrl.startsWith('https://')}
          onClick={() => void run('policy', () => watchPolicy({ caseId: detail.case._id, targetUrl: policyUrl }))}
        >
          {busy === 'policy' ? 'Creating Firecrawl monitor…' : 'Watch this public page'}
        </button>
      </section>
      <section className="case-sheet">
        <div className="sheet-folio">
          <span>Public form / interact</span>
          <span>Stops before submit</span>
        </div>
        <h3>Fill a public form. Stop before submit.</h3>
        <p className="sheet-deck">
          Firecrawl /interact prepares a no-login form with sample values and
          stops. Login, card, and bank fields abort the run.
        </p>
        <button
          className="approve-action"
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            void run('form', () =>
              fillPublicForm({
                caseId: detail.case._id,
                formUrl: policyUrl || undefined,
              }),
            )
          }
        >
          {busy === 'form' ? 'Filling public form…' : 'Prepare public form'}
        </button>
        {formDrafts.map((draft) => (
          <p key={draft._id}>
            <strong>{draft.subject}</strong>
            <span> · {draft.status.replaceAll('_', ' ')}</span>
          </p>
        ))}
      </section>
      <section className="recent-record">
        <div className="section-heading">
          <h3>Active watches</h3>
        </div>
        {detail.monitors.length === 0 ? (
          <div className="quiet-empty">
            <span>No watches yet</span>
            <p>Arm a deadline or public policy page to see proactive catches here.</p>
          </div>
        ) : (
          detail.monitors.map((monitor) => (
            <div className="record-line" key={monitor._id}>
              <Mark name={monitor.kind} />
              <p>
                <strong>{monitor.kind.replaceAll('_', ' ')}</strong>
                <span>{monitor.lastChangeSummary ?? monitor.targetUrl ?? 'Deadline watch'}</span>
              </p>
              <time>
                {monitor.lastCheckedAt
                  ? formatDate(monitor.lastCheckedAt, true)
                  : 'Not checked yet'}
              </time>
            </div>
          ))
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}

function AuditView({ audit }: { audit: Doc<'auditLog'>[] }) {
  return (
    <div className="audit-layout audit-depth">
      <header>
        <p className="kicker">Record</p>
        <h2>How this case ran.</h2>
        <p>Firecrawl, OpenAI, AgentMail, and your approvals, in order, never rewritten.</p>
      </header>
      {audit.length === 0 ? (
        <div className="quiet-empty"><span>Record not started</span><p>The first case action will appear here.</p></div>
      ) : (
        <ol className="audit-timeline">
          {audit.map((entry, index) => {
            const story = describeAuditEvent(entry.event)
            return (
              <li key={entry._id}>
                <div className="audit-sequence">{String(audit.length - index).padStart(3, '0')}</div>
                <Mark name={story.vendor === 'You' ? 'B' : story.vendor} />
                <div className="audit-copy">
                  <p>
                    <span className={`audit-vendor vendor-${story.vendor.toLowerCase()}`}>{story.vendor}</span>
                    <time>{formatDate(entry.createdAt, true)}</time>
                  </p>
                  <h3>{story.title}</h3>
                  <p>{entry.detail}</p>
                  <details className="audit-tech">
                    <summary>Technical id</summary>
                    <small>{entry.operationId}</small>
                  </details>
                </div>
                <span className={`audit-status ${entry.status}`}>{entry.status}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
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
