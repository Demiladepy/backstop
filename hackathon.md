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

## Submission links

- Live app: https://backstop-xi.vercel.app
- Public repository: https://github.com/Demiladepy/backstop
- Demo video: TODO — record from `DEMO.md` (under 3 minutes)
- Submit on vibeapps.dev before Sep 22, 2026, 12:00 PM PT

## Demo safety

Backstop is a hackathon demo and is not HIPAA compliant. Use only fake/sample
medical documents. Never enter credentials, card numbers, or bank details.
