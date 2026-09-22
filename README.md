# Backstop

Drafts and sends the appeals you approve — not legal or medical advice.

Backstop turns a medical insurance denial into a cited appeal you control. It reads a sample denial, finds the payer’s published policy, drafts from stored sources, and **does not send until you approve**.

[Live app](https://festive-roadrunner-713.convex.site) · [Demo script](DEMO.md) · [Demo video](https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm)

<p align="center">
  <img src="public/images/alpine.jpg" alt="Backstop landing hero — alpine dusk" width="1200" />
</p>

One case type. One host. One send gate.

## The rail

Open [festive-roadrunner-713.convex.site](https://festive-roadrunner-713.convex.site) → **Enter private demo** → **Start a sample case**.

```
Denial + EOB  →  Evidence  →  Appeal (grounded)  →  Approve  →  Email
     Firecrawl parse          OpenAI cited draft      AgentMail send
     + policy scrape          unverified if uncited   replies still gated
```

Email and Watch appear only after the send gate. There is no side path.

On **Appeal**, the three panes are the product:

| Denial | Claim | Policy proof |
|--------|--------|----------------|
| Their reason line, highlighted | The sentence Backstop wants to send | Verbatim clause from a live URL, with **Open original** |

Approve is the only path that delivers mail.

## Stack (real work, not README badges)

| Sponsor | What it actually does |
|---------|------------------------|
| **Convex** | Reactive backend, auth, file storage, audit log, scheduling, [static hosting](https://festive-roadrunner-713.convex.site) |
| **Firecrawl** | Parse the denial, search/scrape public policy, optional deadline/page monitors, form fill that stops before submit |
| **OpenAI** | Cited appeal draft and reply understanding. Unsupported claims stay marked `unverified` |
| **AgentMail** | Dedicated inbox, outbound send, inbound thread. Follow-ups still need approval |

Every external step appends an immutable `auditLog` row.

## Guardrails

- Demo only. **Not HIPAA compliant.** Use fictional or fully de-identified samples from `public/samples/`. Never enter real health information.
- Never collect passwords, card numbers, or bank details.
- Drafting and sending are separate. Nothing leaves without `approveDraft`.
- No citation → the claim is labelled unverified, not asserted.

## Local development

```bash
npm install
cp .env.example .env.local   # set VITE_CONVEX_URL
npx convex dev               # set Firecrawl, OpenAI, AgentMail on the deployment
npm run dev
```

Sponsor keys live in Convex environment variables, not the frontend. Only `VITE_CONVEX_URL` is public.

### Checks

```bash
npm run lint
npm test                     # 26 convex-test cases
npm run build
npx playwright test
npx playwright test --config=e2e/live-smoke.config.ts   # live convex.site
```

## Docs

| Doc | What it is |
|-----|------------|
| [DEMO.md](DEMO.md) | Under-3-minute walkthrough for judges |
| [SUBMISSION.md](SUBMISSION.md) | Links and paste sheet |
| [hackathon.md](hackathon.md) | Build log |
| [BACKSTOP.md](BACKSTOP.md) | Product rules |
