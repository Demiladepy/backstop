# Backstop — Convex All Gas Hackathon build log

## What we are building

Backstop helps a person contest a medical insurance denial
without surrendering control to an autonomous agent. It parses a sample
document, grounds an appeal in the payer's real published policy, drafts a
cited response, and sends only after explicit human approval. Every external
action is audited.

> Drafts and sends the appeals you approve — not legal or medical advice.

## Stack

- Convex: reactive backend, file storage, actions, audit log, scheduling, and
  static hosting
- OpenAI: clause extraction, grounded drafting, and reply understanding
- Firecrawl: parse, search, scrape, monitor, and public-form interact (stops
  before submit; credential fields abort)
- AgentMail: dedicated inbox, outbound delivery, inbound webhook, and threading
- React and TypeScript: live case board and approval interface

## Build log

### P0 — Foundation

- Created the React and TypeScript application shell.
- Installed and verified the official Convex agent skills and MCP server.
- Installed CLI-managed Convex AI guidance.
- Configured the official `@convex-dev/static-hosting` component.
- Provisioned and verified personal cloud development deployment
  `patient-retriever-701`.
- Deployed the backend and frontend to production static hosting at
  `festive-roadrunner-713.convex.site`.
- Created and verified the public GitHub repository.

### P1–P3 — Parse, ground, and draft

- Added owner-isolated Convex Auth beta sessions and the complete reactive data
  spine.
- Added audited Firecrawl `/parse`, `/search`, and `/scrape` actions.
- Added OpenAI Responses API structured drafting with paragraph-level source
  validation and visible `[UNVERIFIED]` fallback labels.
- Enforced medical denial as the only creatable v1 case type.
- Auto-seeds the fictional sample denial on case open and chains
  parse → research → draft without manual clicks.

### P4–P5 — Approval, email, audit, and product

- Installed the official `@agentmail/convex` component for durable sends,
  verified inbound webhooks, local thread state, and reactive inbox data.
- Made approval idempotent and the sole path that schedules an email send.
- Added gated follow-up drafts for inbound replies; replies never trigger an
  automatic send.
- Added a demo-only simulate-inbound helper for a reliable reply beat.
- Built the complete editorial intake, live board, evidence register, cited
  appeal review, correspondence, and append-only record UI.
- Backend Vitest suite and Chromium e2e cover entrance, case create, sample
  seed visibility, keyboard focus, and mobile overflow.

### P6 — Depth

- Added Firecrawl `/monitor` deadline and public-page watches, hourly rechecks,
  and a signed monitor webhook.
- Added Firecrawl `/interact` public-form fill that stops before submit,
  aborts on credential fields, and records a deterministic fallback draft.
- Form-submission drafts require human approval and never send email.
- Watch tab includes a one-click **Run demo Watch beat** (deadline + form).

### Current release gate

- Local: `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e`
- Sponsor keys on both dev and prod Convex deployments
- Live app: https://festive-roadrunner-713.convex.site (Convex static hosting)
- Public repository: https://github.com/Demiladepy/backstop

### Day 1 — Harden hero + real AgentMail

- Shared Backstop AgentMail inbox via `AGENTMAIL_SHARED_INBOX_*` (no per-case inbox burn).
- Local demo outbound only when `DEMO_ALLOW_LOCAL_SEND=1` (unset on prod).
- Late research no longer clobbers approved/sent cases.
- Live smoke defaults to Vercel; hero path verified green on
  https://backstop-xi.vercel.app (auth, approve→email, simulate, Watch, mobile).

### Day 2 — Vercel build + AgentMail HTTP delivery

- Fixed Vercel production build: `tsc -b` pulled `convex/email.ts` via generated
  API types; added Node types to `tsconfig.app.json` / `convex/tsconfig.json`
  so `process.env` typechecks.
- App-side AgentMail HTTP send uses deployment `AGENTMAIL_API_KEY` (avoids
  component workpool missing the key).
- Re-verified live hero smoke on Vercel after deploy.

### Day 3 — Trust UX + reply-loop handoff

- Appeal: denial excerpt beside draft; citation chips highlight notes and link
  to Evidence / original URL; shared [N] numbering with Evidence; unverified
  count in the review margin; follow-up drafts labeled as such.
- Email: after simulate / inbound, banner to review & approve the follow-up
  (approve remains the only send gate).
- Record: vendor-labeled timeline (Firecrawl / OpenAI / AgentMail / You) with
  technical ids collapsed.
- Workspace chrome: light Obsidian three-pane structure on paper brand.

### Day 4 — Multi-doc packet + board intelligence

- Sample packet seeds fictional denial + EOB (`seedSamplePacket`); both parse
  and can be cited before approve.
- Policy research uses all document excerpts, not only the first.
- Case board sorts needs-review first, shows deadline urgency, and a review queue strip.
- Evidence tiles label document kinds; appeal compare shows every document source.

### Day 5 — Demo packaging

- Landing hero: product headline + single primary CTA (Enter private demo).
- Idempotent `seedDemoCaseload` + board affordance for a 3-row medical_denial list.
- DEMO.md narration cue sheet + `demo/backstop-hero-demo.srt`; `npm run demo:record`.
- README aligned to Vercel live URL, DEMO, and video links.

### Day 6 — Freeze + polish

- Demo caseload rows are non-openable fillers (no broken empty “needs review” trap).
- Packet wording aligned on intake busy state and next-step empty copy.
- Added `SUBMISSION.md` paste sheet for vibeapps; DEMO.md warns fillers ≠ hero path.
- Re-smoke: lint, build, unit tests, live Vercel hero path.

### Day 7 — Grounding integrity + single host

- **Fixed the defect that undercut the core claim.** Every URL in the curated
  policy list had rotted (3x 404, 1x 403). Firecrawl returns a soft 404 with a
  200-shaped result, so the Medicare "Page Not Found" body scraped cleanly,
  passed the verbatim-containment check against itself, and became a *cited*
  policy source. The live appeal quoted an error page, and **Open original**
  sent the reader to a 404.
- Replaced the curated list with URLs verified live, and documented that they
  must be re-verified before any demo.
- Added `looksLikeErrorPage` — error, block, and interstitial pages are
  rejected before a scrape can become a source. Regression test pins the exact
  Medicare 404 body that shipped.
- Sources now carry `verification: "quoted" | "unverified"`. An excerpt that
  could not be matched as a verbatim clause is kept as visible evidence but is
  **not citable**: `draftAppeal` refuses to rest a paragraph on it, so the
  paragraph is labelled `[UNVERIFIED]` instead of silently asserted. Research
  prefers verbatim-quote candidates and only falls back to fill the target.
- The appeal and citation register show the unconfirmed state in the UI, so the
  failure mode is visible to the reader rather than only in the data.
- **Fixed a second, quieter grounding failure.** `beginDraft` allowed a manual
  "Draft grounded appeal" click while research was still in flight; it flipped
  the case to `drafting`, and `completeResearch` then discarded the finished
  scrape as "late research". The appeal came out with zero policy citations.
  `beginDraft` now waits for research (it chains into drafting anyway), and
  `completeResearch` uses the same past-research test as `failResearch`, so a
  successful scrape is no longer thrown away in a case where a failed one
  would have proceeded.
- Live smoke now asserts the grounding beat itself: a cited **insurer policy
  clause**, a working `https` original link, and no error-page text in the
  proof pane. It passes against convex.site — this box had never been checked.
- **One host.** The rules require Convex static hosting; the Vercel mirror was
  serving a five-day-old build with a different landing page. Removed it from
  every judge-facing doc. `e2e/live-vercel.*` renamed to `e2e/live-smoke.*`
  (it already targeted convex.site).

### Day 8 — Grounding made visible

- **The denial highlight never rendered.** `denialHighlightSegments` picked the
  reason sentence out of a whitespace-collapsed copy, then looked it up in the
  original with `indexOf`. Every real letter wraps across lines, so the lookup
  always missed and the pane fell back to unhighlighted text — including for
  the blessed sample, whose pinned constant was also the collapsed form. Match
  is now whitespace-tolerant and tiered (most specific reason phrase first,
  with a length cap so a run-on header cannot win). The helper moved into
  `convex/researchHelpers.ts` with unit tests, and live smoke asserts a visible
  `.denial-hit`, so it cannot regress silently again.
- Verified on an **uploaded** messy fax-style scan, not the blessed packet:
  parse -> 2 verified policy URLs -> 3 cited claims -> highlighted reason line.
- Strip inline `(sourceIds: [...])` the model occasionally wrote into prose;
  raw document ids must never reach a payer.

### Day 9 — Delivery, one rail, one brand

- **No appeal email had ever actually been delivered.** The app posted to
  `POST /v0/inboxes/{id}/messages`; AgentMail's send route is
  `/v0/inboxes/{id}/messages/send`, so every send returned 404 and fell back to
  the component workpool, which then failed with `AGENTMAIL_API_KEY is not set`
  (deployment env vars are not visible inside a component). The message row
  still said `sent`. Fixed the route; sends now return a real AgentMail
  `message_id` and `thread_id`, and the audit records
  `external.agentmail.send_delivered` instead of `send_queued`.
- A component enqueue is a queue ticket, not proof of delivery, so it no longer
  writes `status: "sent"`. Only a confirmed HTTP send may claim that.
- Outbound rows now persist the AgentMail `thread_id`, so a real reply threads
  against the message it answers.
- **One rail.** Email and Watch only join the tab bar once the appeal clears
  the human gate. Before that the motion is Case -> Evidence -> Appeal ->
  approve, with no side door. A tab that is not on the rail falls back to Case
  rather than rendering an empty pane.
- **The reply loop is reachable again, without polluting the hero.** The
  fictional payer address never answers, so Email (post-send only) offers one
  labelled demo reply. Live smoke now drives it and asserts the inbound message
  threads back and that a reply still sends nothing on its own.
- **One brand.** The hero used a hardcoded cobalt `#5266eb` that matched no
  token, so the same "Enter private demo" action rendered in three different
  colours. It is now the sanctioned dark-hero inversion: Snow fill, Obsidian
  text.
- `package.json` renamed `redress` -> `backstop` to match the product and repo.

## Submission links

- Live app: https://festive-roadrunner-713.convex.site
- Public repository: https://github.com/Demiladepy/backstop
- Demo video: https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm
- Demo release page: https://github.com/Demiladepy/backstop/releases/tag/demo-video
- Submit on vibeapps.dev before Sep 22, 2026, 12:00 PM PT:
  https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit

## Demo safety

Backstop is a hackathon demo and is not HIPAA compliant. Use only fake/sample
medical documents. Never enter credentials, card numbers, or bank details.
