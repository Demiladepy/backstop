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
- Live app: https://backstop-xi.vercel.app
- Convex static host: https://festive-roadrunner-713.convex.site
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

## Submission links

- Live app: https://backstop-xi.vercel.app
- Public repository: https://github.com/Demiladepy/backstop
- Demo video: https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm
- Demo release page: https://github.com/Demiladepy/backstop/releases/tag/demo-video
- Submit on vibeapps.dev before Sep 22, 2026, 12:00 PM PT:
  https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit

## Demo safety

Backstop is a hackathon demo and is not HIPAA compliant. Use only fake/sample
medical documents. Never enter credentials, card numbers, or bank details.
