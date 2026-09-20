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

- [x] Single hero rail (no caseload fillers / simulate inbound / Watch demo beat in UI)
- [x] Appeal three-pane grounding (denial · claim · policy proof)
- [x] Upload-on-rail + messy sample under `public/samples/`
- [x] One product skin (landing uses `App.css`; cinematic `landing-ah` removed)
- [x] Canonical live URL is `festive-roadrunner-713.convex.site` in README / DEMO / SUBMISSION / e2e defaults
- [ ] Replace release webm with voiced remux (you record VO; captions in `demo/backstop-hero-demo.srt`)
- [ ] `git push origin master` includes this pass
- [x] `npx convex deploy -y` on prod after backend changes
- [ ] Walk DEMO.md hero path once on the live convex.site URL
- [x] `npx playwright test --config=e2e/live-smoke.config.ts` passes against convex.site (3 runs green)
- [ ] Paste links + pitch on vibeapps (sign-in required — do this yourself)
- [ ] Post 40s social cut (script in `demo/social-40s.md`)

## Social 40s

See [`demo/social-40s.md`](demo/social-40s.md).
