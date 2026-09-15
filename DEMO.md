# Demo script (under 3 minutes)

Live app: https://backstop-xi.vercel.app  
Convex mirror: https://festive-roadrunner-713.convex.site  
Public repo: https://github.com/Demiladepy/backstop

Silent cut (current release):  
https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm

Captions draft (for narrated remux): [`demo/backstop-hero-demo.srt`](demo/backstop-hero-demo.srt)

Positioning line — say **once**, near the open:

> Drafts and sends the appeals you approve — not legal or medical advice.

## Narration cue sheet (VO)

| Time | On screen | Say |
|------|-----------|-----|
| 0:00–0:15 | Landing → Enter private demo | “Backstop turns a medical denial into a cited appeal you control.” Then the positioning line once. |
| 0:15–0:35 | Start a sample case → case opens | “Opening a sample case attaches a fictional denial letter and EOB — no real PHI.” |
| 0:35–1:05 | Evidence / Appeal live | “Firecrawl parses and researches policy. OpenAI drafts from stored sources. Unsupported claims stay marked unverified.” |
| 1:05–1:35 | Citations → Approve and send → Email + Record | “Click a citation to see the note. Approve is the only send gate. Record shows Firecrawl, OpenAI, and AgentMail in order.” |
| 1:35–2:05 | Simulate reply → follow-up banner → Appeal | “A fictional payer reply still waits for your approval before anything goes out again.” |
| 2:05–2:35 | Watch → Run demo Watch beat | “Deadline watch and a public form fill that stops before submit — no passwords, no cards.” |
| 2:35–2:55 | Case board | “One case type: medical denials. Human approval is the backstop.” |

Optional board beat (if recording from a fresh session): **Load sample caseload**
so the list shows density and deadline urgency. Those rows are **board fillers only** —
do not open them for the hero path. Always use **Start a sample case** for the live
parse → draft → approve demo.

## Record a silent capture (local)

```powershell
npm run demo:record
```

Video lands under Playwright’s output folder for `e2e/live-demo-record`. Remux with VO/captions offline, then replace the GitHub release asset when ready.

## Spoken outline (compact)

0:00–0:20 — Open the live site. **Enter private demo**. **Start a sample
case**. Keep defaults. **Open case file** — denial + EOB attach automatically.

0:20–1:00 — **Evidence** / **Appeal**. Parse → policy → cited draft. Note both
documents. Call out unverified claims if any.

1:00–1:40 — Citations. **Approve and send**. **Email** + **Record**. Optionally
**Simulate fictional payer reply**, then follow-up banner → Appeal — still waits
for approval.

1:40–2:20 — **Watch** → **Run demo Watch beat**. Deadline armed; form filled;
submit never clicked.

2:20–2:50 — Board. Close on medical-denial only + human approval.
