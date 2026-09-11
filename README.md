# Backstop

Backstop helps a person contest a medical insurance denial without handing
control to an autonomous agent.

> Drafts and sends the appeals you approve — not legal or medical advice.

The live app is at [festive-roadrunner-713.convex.site](https://festive-roadrunner-713.convex.site).
The public repository is [github.com/Demiladepy/backstop](https://github.com/Demiladepy/backstop).

## What it does

1. Upload a fictional denial letter.
2. Parse it with Firecrawl.
3. Search and scrape the payer's public policy language.
4. Draft a cited appeal with OpenAI.
5. Send only after you approve.
6. Thread the reply in AgentMail.
7. Optionally watch a deadline/public page and prepare a public form up to submit.

## Local development

```bash
npm install
npx convex dev
npm run dev
```

Checks:

```bash
npm run lint
npm test
npm run build
npx playwright test
```

Keep Firecrawl, OpenAI, and AgentMail keys in Convex environment variables.

## Safety

This is a hackathon demo and is not HIPAA compliant. Use only fake or sample
documents. Never enter credentials, card numbers, or bank details.
