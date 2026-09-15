# Submission paste sheet

Use these on [vibeapps.dev submit](https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit)
before **Sep 22, 2026, 12:00 PM PT**.

## Links

| Field | Value |
|--------|--------|
| Live app | https://backstop-xi.vercel.app |
| Repository | https://github.com/Demiladepy/backstop |
| Demo video | https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm |
| Demo script | https://github.com/Demiladepy/backstop/blob/master/DEMO.md |

## One-line pitch

Drafts and sends the appeals you approve — not legal or medical advice.

## Three bullets for judges

- Medical-denial only: sample denial + EOB → Firecrawl parse/research → OpenAI cited draft → approve-only AgentMail send.
- Human gate: follow-up replies and form fills never send without approval; every external step is audited.
- Stack shown live: Convex reactivity, Firecrawl, OpenAI, AgentMail on https://backstop-xi.vercel.app.

## Pre-submit checklist

- [ ] `git push origin master` includes Days 5–6
- [ ] `npx convex deploy -y` on prod after backend changes
- [ ] Vercel production deploy green for `backstop-xi.vercel.app`
- [ ] Walk DEMO.md hero path once on the live URL
- [ ] `npx playwright test --config=e2e/live-vercel.config.ts` passes
- [ ] Paste links + pitch on vibeapps (sign-in required — do this yourself)
