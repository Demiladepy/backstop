# Backstop

Backstop helps a person contest a medical insurance denial without handing
control to an autonomous agent.

> Drafts and sends the appeals you approve — not legal or medical advice.

**Live app:** [festive-roadrunner-713.convex.site](https://festive-roadrunner-713.convex.site)  
**Repo:** [github.com/Demiladepy/backstop](https://github.com/Demiladepy/backstop)  
**Demo script:** [DEMO.md](DEMO.md)  
**Silent demo video:** [release asset](https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm)

## What it does

1. Open a sample medical-denial case (fictional denial letter + EOB).
2. Parse documents with Firecrawl.
3. Search and scrape public policy language.
4. Draft a cited appeal with OpenAI.
5. Send only after you approve.
6. Thread replies with AgentMail (follow-ups still need approval).
7. Optionally watch a deadline / public page and prepare a form up to submit.

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
npx playwright test --config=e2e/live-smoke.config.ts
npm run demo:record
```

Keep Firecrawl, OpenAI, and AgentMail keys in Convex environment variables.

Submission paste sheet: [SUBMISSION.md](SUBMISSION.md).

## Safety

This is a hackathon demo and is not HIPAA compliant. Use only fake or sample
documents. Never enter credentials, card numbers, or bank details.
