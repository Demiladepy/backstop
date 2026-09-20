# Demo script (under 3 minutes)

**Live app:** https://festive-roadrunner-713.convex.site  
Public repo: https://github.com/Demiladepy/backstop

Silent cut (current release — replace with voiced remux before submit):  
https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm

Captions draft: [`demo/backstop-hero-demo.srt`](demo/backstop-hero-demo.srt)

Positioning line — say **once**, near the open:

> Drafts and sends the appeals you approve — not legal or medical advice.

## Narration cue sheet (VO)

| Time | On screen | Say |
|------|-----------|-----|
| 0:00–0:15 | Landing → Enter private demo | “Backstop turns a medical denial into a cited appeal you control.” Then the positioning line once. |
| 0:15–0:35 | Start a sample case → case opens | “Opening a sample case attaches a fictional denial letter and EOB — no real PHI.” |
| 0:35–1:05 | Evidence / Appeal filling | “Firecrawl parses and researches policy. OpenAI drafts from stored sources. Unsupported claims stay marked unverified.” |
| 1:05–1:50 | **Appeal grounding** — cite → Open original | “Here is their denial — this line. Here is our appeal — this claim. And here is their own policy language, live from their page. Backstop will not send until I say so.” |
| 1:50–2:20 | Approve and send → Email + Record | “Approve is the only send gate. Record shows Firecrawl, OpenAI, and AgentMail in order.” |
| 2:20–2:50 | Case board | “One case type: medical denials. Human approval is the backstop.” |

**Emotional climax:** the grounding beat + Approve tap (about 1:05–2:00). Do not pad with caseload fillers, simulate reply, or Watch demo beat.

Optional second take: **Upload a denial file** → attach [`public/samples/messy-denial-scan.txt`](public/samples/messy-denial-scan.txt) → same grounding screen → Approve.

## Record a silent capture (local)

```powershell
npm run demo:record
```

Video lands under Playwright’s output folder for `e2e/live-demo-record`. Remux with VO/captions offline, then replace the GitHub release asset when ready.

## Spoken outline (compact)

0:00–0:20 — Open https://festive-roadrunner-713.convex.site. **Enter private demo**. **Start a sample case**. **Open case file**.

0:20–1:00 — **Evidence** / **Appeal**. Parse → policy → cited draft.

1:00–1:50 — Click the first cite chip. Show the policy quote. **Open original**. Speak the grounding thesis.

1:50–2:30 — **Approve and send**. **Email** + **Record**. Close on human approval.
