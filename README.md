# Backstop

Backstop helps patients turn medical denials into evidence-backed appeals while
keeping people in control of every external action.

> Drafts and sends the appeals you approve — not legal or medical advice.

This repository is currently at **P0: foundation**. It contains a
React/TypeScript frontend shell, the Convex dependency and initial schema, and
project-wide safety rules. Denial intake, retrieval, drafting, approval, email,
and other product workflows are intentionally not implemented yet.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Convex setup

The schema is deliberately empty at P0. The project has been verified against a
local anonymous Convex deployment. To link it to a persistent cloud project,
sign in from an interactive terminal and reconfigure the development
deployment:

```bash
npx convex login
npx convex dev --configure new
```

The official static-hosting component is configured. Once the cloud project is
linked, deploy it with `npm run deploy`. Keep integration secrets in the Convex
environment, never in `VITE_*` variables or frontend code.

Do not add Firecrawl, OpenAI, or AgentMail keys until their integration phase.
Read `AGENTS.md` before implementing any workflow.

## Hackathon links

- Live URL: TODO
- Demo video: TODO
- Public repository: TODO

## Safety notice

Backstop is a hackathon demo and is not HIPAA compliant. Do not enter protected
health information, credentials, or payment details.
