# Backstop — Concept Notes

How this idea was chosen. Not a pitch — the reasoning trail. Every design
decision traces back to the rubric and to what the judging panel, in their own
public words, rewards.

## The premise

The All Gas rubric is unusually explicit about what it wants, and it opens with
a line most entrants ignore: *"everyday apps, not developer tools. Copycats and
developer-only tools score low."* So the design didn't start from "what's a cool
agent." It started from a constraint: build something a real person uses this
week, that makes all four sponsors do real work, and that a tired judge
comparing fifty apps feels in thirty seconds.

That reframes the problem. The winning idea isn't the most novel one — on this
rubric every winner is describable in a sentence. It's the one where the
sponsors are load-bearing, the demo has an emotional climax, and the core
insight is something the judges already believe. So the method was: read the
panel, find what they converge on, and build the everyday app that sits exactly
on that convergence.

## The method: read the whole panel, not the prompt

I went through the Luma page, then every judge's public writing, one by one —
Convex, OpenAI, Firecrawl, AgentMail, and the two guest-judge companies
(ClarityCare AI, Vigil Labs). Not to flatter anyone: to find what this specific
room rewards, because the app is scored by them, not by me. The panel breaks
into blocs, and the blocs converge.

**Convex (the largest bloc).** Wrap the risky, irreversible operations in a
tightly-controlled, small-surface component, then let agents work on top.
Running through the same bloc: an openly stated worry about prompt injection
even while giving agents more access because it is so useful; spare-time
prompt-injection testing to prove assistants misbehave; and the repeated line
*"I don't want to use your agent, I want to use my agent to use your thing"* —
agents that act, not chatbots. Convex's own stated criterion is real depth: live
queries, mutations, reactivity, scheduled functions — not a thin frontend.

**OpenAI.** Models are moving *"from generating answers to managing entire
workflows,"* and *"lack of ambition is the biggest bottleneck."* Alongside that,
a whole feed of watch-it-work delight — the demo has to be magical and clickable
in seconds.

**AgentMail.** Agents with a real email identity doing autonomous two-way work
(*"Devin emailed me when I went quiet"*), plus visible pride in
permission-scoped, least-privilege API keys.

**The two guest judges were the tell.** ClarityCare AI is an AI clinical-review
and prior-authorization platform: it reads documents, applies the real
guidelines, writes grounded rationales, logs complete reasoning trails, and
learns under expert supervision. Vigil Labs works on real-time AI that augments
human decision-makers, with a stated thesis of evidence, edit-before-send,
audit — the shift from executing to reviewing.

## The convergence

Lay those side by side and the panel is independently asking for the same five
things:

1. **Everyday and useful in a real vertical** — not a dev tool.
2. **An agent that acts on the world**, not a chatbot.
3. **Trust:** human-in-the-loop, review-before-send, audit, least privilege —
   the single most-repeated value on the panel.
4. **Grounded in real evidence**, not asserted.
5. **Delight you can click in thirty seconds.**

The gap this panel points at is not "another autonomous agent." It's a
trustworthy one — an agent that does real, irreversible-looking work but
demonstrably can't overstep. Most entrants will ship a reckless fully-autonomous
agent. The thing this room is quietly begging for is the opposite.

## The idea that sits on the convergence

**Backstop:** an everyday agent that helps a normal person fight a wrongful
medical bill or insurance denial — and stops for a human tap at every
irreversible step.

Why this, specifically, and not the neighbours:

- **It's the most everyday, highest-stakes, most relatable version of the
  pattern.** Nearly everyone has a denied claim or a wrongful charge they gave
  up on. That clears the rubric's first line cleanly and gives the demo real
  emotional weight.
- **The mechanism is a domain judge's own worldview.** Read the denial, apply
  the real policy, write a grounded rationale, log the reasoning trail, human
  supervises — pointed at the patient's side instead of the payer's.
- **The trust layer isn't bolted on; it's structurally necessary.** You would
  never auto-send a legal-sounding appeal. So the human gate is obvious and
  native, which turns the panel's most-repeated value into the product's core
  rule.
- **It passes the next-model test:** a stronger model writes a better appeal,
  still under human review. The app improves as models improve rather than
  becoming obsolete.

## The non-negotiable design rule (the moat and the safety)

The agent surfaces, grounds, drafts, and prepares — up to the irreversible gate
— and stops. Every send or submit is a human tap. It never touches passwords,
cards, or money. Every action is logged to an append-only audit trail, and every
claim in a draft cites a real source or is flagged `unverified`. This is not a
limitation to apologise for — it is the headline, and it is exactly the anxiety
(prompt injection, over-broad agent access) that the panel posts about, shown
solved.

## How each sponsor earns its place (one workflow, four distinct jobs)

- **Firecrawl — the evidence layer.** `/parse` turns the uploaded denial or bill
  into clean structured data; `/search` and `/scrape` pull the payer's real
  policy pages so every claim is grounded in a live source, not a hallucination;
  `/monitor` watches deadlines and windows proactively; `/interact` fills a
  public appeal or complaint form up to the submit button.
- **OpenAI — the reasoning layer.** Extracts the exact relevant clause, drafts
  the appeal grounded in it, and interprets replies to propose the next step.
- **AgentMail — the correspondence layer.** The agent's own inbox and identity:
  it sends the approved appeal and manages the two-way thread when the payer
  replies.
- **Convex — the coordination spine.** Reactive case board, actions → internal
  mutations, file storage, scheduled deadline checks, the append-only audit log,
  inbound-email webhooks, and static hosting. Real depth, not a thin frontend.

## What the shape deliberately is not

- **Not a developer tool.** The user is a patient, not an engineer.
- **Not a chatbot.** It acts — it corresponds, files, and fills forms.
- **Not a reckless autonomous agent.** The whole point is the gate.
- **Not sprawling.** One case type (medical denial) shipped end-to-end, with the
  engine architected to generalise to other paperwork later. Breadth lives in
  the roadmap; the demo proves one bulletproof rail.

## The one-line summary

The panel, in its own words, is asking for an everyday app whose agent does
real, grounded, irreversible-looking work but never oversteps a human. Backstop
is that request, executed — a patient's advocate that reads the denial, quotes
the insurer's own policy back at them, and won't send a word until you tap
approve.

---

## What actually shipped against this rule

| Rule in the concept | Where it lives in the build |
|---|---|
| Human tap at every irreversible step | `approveDraft` is the only path that sends; counter-drafts are gated too |
| Grounded or flagged | Error pages rejected before becoming sources; quotes matched verbatim; unsourced paragraphs labelled `[UNVERIFIED]` |
| Append-only audit trail | Every Firecrawl, OpenAI and AgentMail action writes an `auditLog` row |
| Never touches credentials or money | No password, card or bank field anywhere; `/interact` aborts on credential fields |
| Agent acts, two-way | Real AgentMail inbox sends the appeal; inbound replies thread back and trigger re-grounding |
