# Backstop

Drafts and sends the appeals you approve — not legal or medical advice.

Backstop turns a medical insurance denial into a cited appeal you control. It reads a sample denial, finds the payer’s published policy, drafts from stored sources, and **does not send until you approve**.

[Live app](https://festive-roadrunner-713.convex.site) · [Demo script](DEMO.md) · [Demo video](https://github.com/Demiladepy/backstop/releases/download/demo-video/backstop-hero-demo.webm)

**Built for the Convex All Gas Hackathon on four sponsor layers:**
[@convex](https://x.com/Convex) (state) · [@firecrawl](https://x.com/firecrawl) (evidence) · [@OpenAI](https://x.com/openai) (reasoning) · [@agentmail](https://x.com/agentmail) (correspondence)

<p align="center">
  <img src="public/images/alpine.jpg" alt="Backstop landing hero — alpine dusk" width="1200" />
</p>

One case type. One host. One send gate.

## The rail

Open [festive-roadrunner-713.convex.site](https://festive-roadrunner-713.convex.site) → **Enter private demo** → **Start a sample case**.

```
Denial + EOB  →  Evidence  →  Appeal (grounded)  →  Approve  →  Email
     Firecrawl parse          OpenAI cited draft      AgentMail send
     + policy scrape          unverified if uncited

Insurer rejects  →  Re-ground  →  Counter-draft  →  Approve  →  Email
  AgentMail inbound   Firecrawl re-search       OpenAI answers      still gated
                      against their reason      their stated reason
```

Email and Watch appear only after the send gate. There is no side path.

On **Appeal**, the three panes are the product:

| Denial | Claim | Policy proof |
|--------|--------|----------------|
| Their reason line, highlighted | The sentence Backstop wants to send | Verbatim clause from a live URL, with **Open original** |

Approve is the only path that delivers mail.

## Break and repair

Real appeals get rejected. Backstop does not stop there, and it does not reply on its own.

1. **Insurer rejects.** A reply lands on the AgentMail thread: *"the denial is upheld. Coverage for advanced imaging requires documentation of at least six weeks of provider-directed conservative treatment…"*
2. **Agent re-grounds.** Backstop pulls the stated reason out of the reply and runs a fresh Firecrawl search and scrape aimed at it. Results go through the same checks as first-pass research: error pages rejected, quotes matched verbatim. Survivors are appended to the case as new evidence.
3. **Counter-draft, gated.** OpenAI answers their reason point by point, preferring the newly retrieved sources and citing only verified ones. It lands as **pending approval**. Nothing sends until you approve the exact words.

Every step is on the record: `demo.inbound_simulated` → `external.firecrawl.reground` (*"2 new policy sources"*) → `external.openai.draft_appeal` → awaiting approval. On the live demo, open **Email → Simulate an insurer rejection** (the fictional payer address never answers on its own).

## Four sponsor layers

Each sponsor owns one layer. Remove any one and the product stops working.

| Layer | Sponsor | What it does in Backstop |
|-------|---------|--------------------------|
| **1 · State** | [**Convex**](https://convex.dev) [@convex](https://x.com/Convex) | Reactive queries push every pipeline step live with no refresh. Mutations are the only writers. The scheduler chains parse → research → draft and re-ground → counter-draft. Plus Convex Auth, file storage for uploads, an hourly cron for monitors, HTTP actions for the AgentMail and Firecrawl webhooks, the append-only `auditLog`, and [static hosting](https://festive-roadrunner-713.convex.site) through the official component. |
| **2 · Evidence** | [**Firecrawl**](https://firecrawl.dev) [@firecrawl](https://x.com/firecrawl) | `/parse` reads the uploaded denial. `/search` + `/scrape` retrieve public payer policy, and run again against an insurer's rejection reason. `/monitor` watches deadlines and pages. `/interact` fills a public form and stops before submit. |
| **3 · Reasoning** | [**OpenAI**](https://openai.com) [@OpenAI](https://x.com/openai) | Extracts a verbatim clause from each policy page, drafts the cited appeal, and writes the counter-draft that answers a rejection. Structured outputs only. A paragraph without a verified source ID is labelled `unverified`. |
| **4 · Correspondence** | [**AgentMail**](https://agentmail.to) [@agentmail](https://x.com/agentmail) | A real inbox sends the approved appeal (`messages/send`, real `message_id` and `thread_id`). The inbound webhook threads replies against it, and a reply is what triggers break and repair. |

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
npm test                     # 29 convex-test cases
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
