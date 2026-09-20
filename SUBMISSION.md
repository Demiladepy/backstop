# Submission paste sheet

Use these on [vibeapps.dev submit](https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit)
before **Sep 22, 2026, 12:00 PM PT**.

## Links

| Field | Value |
|--------|--------|
| Live app | https://festive-roadrunner-713.convex.site |
| Repository | https://github.com/Demiladepy/backstop |
| Demo video | https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm |
| Demo script | https://github.com/Demiladepy/backstop/blob/master/DEMO.md |

The app is hosted on Convex static hosting, as the rules require. There is no
secondary host: one live URL, one build.

## One-line pitch

Drafts and sends the appeals you approve — not legal or medical advice.

## Three bullets for judges

- Medical-denial only: sample denial + EOB → Firecrawl parse/research → OpenAI cited draft → approve-only AgentMail send.
- Grounding on Appeal: denial highlight, active claim, live policy quote + Open original — then Approve as the only send gate.
- Stack shown live: Convex reactivity, Firecrawl, OpenAI, AgentMail on https://festive-roadrunner-713.convex.site.

## Pre-submit checklist

Verified on the live convex.site URL, not locally.

- [x] Single hero rail — Email and Watch only appear after the send gate
- [x] Appeal three-pane grounding (denial · claim · policy proof)
- [x] Denial reason line actually highlights (was silently broken on every letter)
- [x] Cited policy clauses are real, verbatim, and link to live pages
- [x] Approve genuinely delivers through AgentMail (route was 404 until Day 9)
- [x] Reply threads back and the follow-up still needs approval
- [x] Proven on an uploaded messy fax scan, not only the seeded packet
- [x] One host, one build, one brand accent
- [x] `npm run lint`, `npm run build`, `npm test` (26) green
- [x] `npx playwright test --config=e2e/live-smoke.config.ts` green against convex.site
- [x] `npx convex deploy -y` + static hosting deployed to prod
- [x] `git push origin master`
- [ ] **Record the voiced video** (under 3 min; captions in `demo/backstop-hero-demo.srt`)
- [ ] **Walk DEMO.md once yourself** on https://festive-roadrunner-713.convex.site
- [ ] **Post the 40s cut** on X tagging @convex @OpenAI @firecrawl @agentmail
- [ ] **Submit on vibeapps** (sign-in required — do this yourself)

## Social 40s

See [`demo/social-40s.md`](demo/social-40s.md).
