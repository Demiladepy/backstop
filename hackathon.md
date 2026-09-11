# Backstop — Convex All Gas Hackathon build log

## What we are building

Backstop helps a person contest a medical insurance denial or wrongful bill
without surrendering control to an autonomous agent. It parses a sample
document, grounds an appeal in the payer's real published policy, drafts a
cited response, and sends only after explicit human approval. Every external
action is audited.

> Drafts and sends the appeals you approve — not legal or medical advice.

## Stack

- Convex: reactive backend, file storage, actions, audit log, scheduling, and
  static hosting
- OpenAI: clause extraction, grounded drafting, and reply understanding
- Firecrawl: parse, search, scrape, monitor, and public-form interaction
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
- Created the public GitHub repository; initial push remains pending.

## Submission links

- Live app: https://festive-roadrunner-713.convex.site
- Public repository: https://github.com/Demiladepy/backstop
- Demo video: TODO — verify before replacing

## Demo safety

Backstop is a hackathon demo and is not HIPAA compliant. Use only fake/sample
medical documents. Never enter credentials, card numbers, or bank details.
