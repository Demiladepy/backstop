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
- Firecrawl: parse, search, and scrape in the core; monitor and public-form
  interaction remain behind the depth release gate
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

### P4–P5 — Approval, email, audit, and product

- Installed the official `@agentmail/convex` component for durable sends,
  verified inbound webhooks, local thread state, and reactive inbox data.
- Made approval idempotent and the sole path that schedules an email send.
- Added newly gated follow-up drafts for inbound replies; replies never trigger
  an automatic send.
- Built the complete editorial intake, live board, evidence register, cited
  appeal review, correspondence, and append-only record UI.
- Added nine adversarial backend tests and two passing Chromium flows covering
  authentication, case creation, keyboard focus, and mobile overflow.

### P6 — Depth

- Added Firecrawl `/monitor` deadline and public-page watches, hourly rechecks,
  and a signed monitor webhook.
- Added Firecrawl `/interact` public-form fill that stops before submit,
  aborts on credential fields, and records a deterministic fallback draft.
- Form-submission drafts require human approval and never send email.

### Current release gate

- Local lint, build, backend tests, and browser tests are the release checks.
- Real sponsor API smoke tests need Firecrawl, OpenAI, and AgentMail env vars.
- Live app: https://festive-roadrunner-713.convex.site
- Public repository: https://github.com/Demiladepy/backstop

## Submission links

- Live app: https://festive-roadrunner-713.convex.site
- Public repository: https://github.com/Demiladepy/backstop
- Demo video: TODO — verify before replacing

## Demo safety

Backstop is a hackathon demo and is not HIPAA compliant. Use only fake/sample
medical documents. Never enter credentials, card numbers, or bank details.
