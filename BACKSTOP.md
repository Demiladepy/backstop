# Backstop project rules

Backstop is a document-grounded advocacy app for medical insurance denials and
wrongful bills. The stack is React, TypeScript, Convex, Firecrawl, OpenAI, and
AgentMail.

Positioning line (use verbatim in product and pitch copy):

> Drafts and sends the appeals you approve — not legal or medical advice.

## Current scope

Phase P0 is foundation only. Do not implement P1 or later workflows until P0
has a verified Convex integration, managed AI files, deployment, static-hosted
live URL, and public repository.

## Inviolable guardrails

1. Never collect, store, log, request, or enter a password, card number, bank
   detail, or other credential.
2. Never send an email or submit a form except through the post-human
   `approveDraft` path. Drafting and approval are separate operations.
3. Every factual claim in a generated draft must reference a stored source row.
   Without a citation, visibly mark the claim `unverified` instead of asserting
   it.
4. Every external action must append an immutable `auditLog` row.
5. Use only fake/sample medical documents in the demo and public repository.
   The app must disclose that it is a demo and is not HIPAA compliant.

## Convex constraints

- Call Firecrawl, OpenAI, AgentMail, and all external APIs only from Convex
  actions, never from queries, mutations, or frontend code.
- Persist action results through internal mutations; actions never write to the
  database directly.
- Use Convex file storage for uploads and a validated Convex HTTP action for
  inbound email.
- Read application state through reactive `useQuery` calls.
- Keep secrets in Convex environment variables. Only public configuration such
  as `VITE_CONVEX_URL` may be exposed to the frontend.
- Prefer maintained official Convex components where available.

## Definition of done

A feature is complete only when it runs end-to-end against a fake sample
document, is deployed to the verified `convex.site` URL, and records an audit
entry for every external step.
