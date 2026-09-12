[![Rams](https://www.rams.ai/logos/logo-rams-lockup.svg)](https://www.rams.ai/)

[Scores](https://www.rams.ai/scores) [Example](https://www.rams.ai/#sample) [Engine](https://www.rams.ai/#engine) [How it works](https://www.rams.ai/#how) [Pricing](https://www.rams.ai/#pricing)

[Log in](https://www.rams.ai/auth/login) [Sign up](https://www.rams.ai/auth/signup)

[Log in](https://www.rams.ai/auth/login) [Sign up](https://www.rams.ai/auth/signup)

# Stop bad UI

Kill slop in its tracks. Every change scored 0–100 against 313 design rules, fixes handed back as patches your agents apply.

[Install Rams](https://www.rams.ai/auth/signup)

![Claude](https://www.rams.ai/logos/agents/claude.svg)![OpenAI](https://www.rams.ai/logos/agents/openai.svg)![Cursor](https://www.rams.ai/logos/agents/cursor.svg)![GitHub](https://www.rams.ai/logos/agents/github.svg)

PricingPage.tsx

PR #42

38<div className="flex gap-3">

39 <button className="bg-white text-black">Get Started</button>

40 <button className="bg-white text-black">Learn More</button>

41</div>

7<button onClick={onClose}>

8 <XIcon className="h-4 w-4" />

9</button>

21<span className="text-2xl">{value}</span>

22<span className="opacity-50">{label}</span>

23

Ramsreviewed line 39–40UX

Two filled C

Icon-only button has no accessible name.

A screen reader announces just “button”. Add aria-label="Close" so the control is identifiable.

Label at opacity-50 fails WCAG AA contrast.

At 50% on this background it lands near 2.8:1. Use a token that meets 4.5:1 for body text.

Apply fixDismiss

## One engine.  Four ways to run it.

The Skill for a free taste in your agent, the MCP for the real score before you commit, the GitHub App for review on every pull request, and the Action to run Team's blocking from your pipeline.

[Skill\\
\\
In your agent · 86,790 installs\\
\\
​/rams\\
\\
Included: A free taste of the engine\\
\\
Not included: Manual, one file at a time\\
\\
Not included: Surface-level checks\\
\\
Not included: No score\\
\\
Included: Free, in any coding agent\\
\\
Get the Skill](https://www.rams.ai/skill) [MCP\\
\\
In your agent · New\\
\\
​$claude mcp add rams\\
\\
Included: The full 313-rule engine\\
\\
Included: Runs before you commit\\
\\
Included: The same score as every PR\\
\\
Included: Catches what the Skill can't\\
\\
Not included: On demand, not automated\\
\\
Add the MCP](https://www.rams.ai/auth/signup) [GitHub App\\
\\
On every PR\\
\\
Checking your PR…\\
\\
Included: The full 313-rule engine\\
\\
Included: Automatic on every PR\\
\\
Included: One-click fixes inline\\
\\
Included: Score history + merge gating\\
\\
Included: Zero setup, your whole team\\
\\
Install the App](https://www.rams.ai/auth/signup) [CI Action\\
\\
In your pipeline · Team\\
\\
​uses: rams-action@v1\\
\\
Included: The full 313-rule engine\\
\\
Included: Team's blocking, in CI\\
\\
Included: Fails the pipeline on criticals\\
\\
Included: Patches for your agents\\
\\
Included: One YAML block\\
\\
Add the Action](https://www.rams.ai/auth/signup?plan=team)

[![React](https://www.rams.ai/logos/logo-react.svg)](https://www.rams.ai/frameworks/react)[![Next.js](https://www.rams.ai/logos/nextjs.svg)](https://www.rams.ai/frameworks/nextjs)[![](https://www.rams.ai/logos/logo-swift.svg)SwiftUI](https://www.rams.ai/frameworks/swiftui) [![Vue.js](https://www.rams.ai/logos/logo-vue.svg)](https://www.rams.ai/frameworks/vue) [![Svelte](https://www.rams.ai/logos/logo-svelte.svg)](https://www.rams.ai/frameworks/svelte) [![Angular](https://www.rams.ai/logos/logo-angular.svg)](https://www.rams.ai/frameworks/angular) [![Tailwind CSS](https://www.rams.ai/logos/logo-tailwind.svg)](https://www.rams.ai/frameworks/tailwindcss)

## Every public repo Rams has reviewed.

Browse real Rams reviews across public repositories. No canned demos, just UI issues found in live codebases.

[![](https://github.com/shamahdev.png?size=64)\\
\\
shamahdev/shamahdev\\
\\
★ 0\\
\\
Top issue\\
\\
Negative word-spacing on all body text crowds every word boundary\\
\\
98/100\\
\\
Low risk](https://www.rams.ai/score/shamahdev/shamahdev) [![](https://github.com/pointfreeco.png?size=64)\\
\\
pointfreeco/swift-composable-architecture\\
\\
★ 15k\\
\\
Top issue\\
\\
Attribution link uses hardcoded gray, breaking Dark Mode and contrast settings\\
\\
98/100\\
\\
Low risk](https://www.rams.ai/score/pointfreeco/swift-composable-architecture) [![](https://github.com/tailwindlabs.png?size=64)\\
\\
tailwindlabs/headlessui\\
\\
★ 29k\\
\\
Top issue\\
\\
Inter font loaded from third-party CDN delays first text paint\\
\\
98/100\\
\\
Low risk](https://www.rams.ai/score/tailwindlabs/headlessui) [![](https://github.com/radix-ui.png?size=64)\\
\\
radix-ui/primitives\\
\\
★ 19k\\
\\
Top issue\\
\\
OTP input group has no accessible name for screen reader users\\
\\
97/100\\
\\
Low risk](https://www.rams.ai/score/radix-ui/primitives) [![](https://github.com/minpeter.png?size=64)\\
\\
minpeter/minpeter.v2\\
\\
★ 15\\
\\
Top issue\\
\\
Arbitrary pt-\[6.5rem\] on the page root breaks the spacing scale\\
\\
96/100\\
\\
Low risk](https://www.rams.ai/score/minpeter/minpeter.v2) [![](https://github.com/mattermost.png?size=64)\\
\\
mattermost/mattermost\\
\\
★ 39k\\
\\
Top issue\\
\\
Important and Warning callouts share the identical '!' icon\\
\\
96/100\\
\\
Low risk](https://www.rams.ai/score/mattermost/mattermost) [![](https://github.com/calcom.png?size=64)\\
\\
calcom/cal.com\\
\\
★ 48k\\
\\
Top issue\\
\\
Booking successful page goes blank with no loading or error state\\
\\
96/100\\
\\
Low risk](https://www.rams.ai/score/calcom/cal.com) [![](https://github.com/chakra-ui.png?size=64)\\
\\
chakra-ui/chakra-ui\\
\\
★ 41k\\
\\
Top issue\\
\\
Color swatch conveys meaning through color alone with no accessible name\\
\\
96/100\\
\\
Low risk](https://www.rams.ai/score/chakra-ui/chakra-ui) [All scores](https://www.rams.ai/scores)

## The whole review, right in your PR.

Every comment includes the issue, its severity, the affected UI area, and a concrete fix, directly inside the pull request where engineers already work.

rams-design-review bot

acme/web-app #42 · Update pricing page

PR score 47/100·Risk High

3 issues found·1 critical·reviewed in 58s

01

Two filled CTAs split focus: the primary action is ambiguousUX

The hero has "Get Started" and "Learn More" both styled as filled white buttons at the same size. Two primary-weight buttons in one row don’t make a hierarchy.

ImpactUsers can’t tell which is primary, so conversion drops on the page’s most valuable click.

Suggested change

−<button className="bg-white text-black">Learn More</button>

+<button className="border border-neutral-700">Learn More</button>

Apply fixDismiss

02

Stat values use hardcoded hex, bypassing the design systemDesign System

The +12% indicator uses an inline color, hardcoding a value that should live in tokens.

ImpactTheme updates and dark-mode passes silently miss these values, so the product drifts as the system evolves.

Suggested change

−<span style={{ color: '#22c55e' }}>+12%</span>

+<span className="text-emerald-500">+12%</span>

Apply fixDismiss

03

Feature grid cards are visually identical, with no entry pointUX

All six feature cards share identical weight, color, and spacing. Nothing draws the eye to any single card.

ImpactUsers scan the headings without absorbing the content. The grid reads as a wall, and the strongest claim never lands.

Apply fixDismiss

This review doesn't block the merge. Fixing these now avoids accessibility issues, UX regressions, and design-system drift.Rams · Automated Design Reviews

## Your team ships UI faster than it’s reviewed.

Design review does not scale with modern frontend velocity. Rams gives every UI change a consistent review before it reaches production.

Prevent competing CTAs

Two primary-weight buttons, no visual ranking, no clear next step. The conversion click splits between actions that look identical.

Prevent low contrast and missing labels

Sub-4.5:1 body text, missing alt attributes, sub-44px targets, suppressed focus rings. Screen-reader and keyboard users get a half-broken page.

Prevent hardcoded hex and one-off spacing

Inline colors that bypass tokens, padding outside the scale, !important overrides on system components. Theme changes silently miss these.

Prevent generic gradients and templated layouts

Purple-to-pink gradients, glow shadows, vague hero copy, identical filled buttons, the output of unedited prompts.

Prevent broken states and duplicate handlers

Submit buttons with no disabled state, double-fired handlers, clickable spans without keyboard support, missing loading states.

Prevent unguarded motion

transition: all watches every property on every render. Animations without prefers-reduced-motion violate WCAG and unsettle users.

## Trained on how senior designers actually review.

313 rules across 9 categories. Not linter rules. Review judgments: the bar is human-level design craft, and a whole category exists to catch AI antipatterns. New rules ship every week. Every repo Rams reviews gets sharper without changing a thing.

313

Review judgments, public in the [rules](https://www.rams.ai/rules)

29,333

UI issues caught before merge

37

Craft rules aimed squarely at AI antipatterns

Accessibility24 rules

Alt textFocus indicatorsTouch targetsContrast ratiosKeyboard navScreen-reader labels

Color25 rules

Color tokensOne gray scaleDark modePalette limitsSemantic colorsContrast on bg

Typography42 rules

Type scaleFont smoothingTabular numsLine-heighttext-balanceLetter spacing

Spacing25 rules

Spacing scaleBorder radiusOptical alignmentGap over marginz-index scaleConcentric radii

Components22 rules

Accessible primitivesComponent reuseDesign tokensVariant patternscn() conditionalsTypeScript props

UX64 rules

Loading statesForm validationHit areasButton semanticsInput font sizeEmpty states

Motion54 rules

prefers-reduced-motionInterruptible transitionsScale on pressExit animationsNo blur > 20pxEasing

Craft37 rules

No gradientsNo glowNo transition:allVisual monotonyNo placeholder textisolation:isolate

## A design engine that keeps improving.

Nine specialist reviewers and 313 encoded judgments today, with new rules added every week. Re-reviews verify the fixes you ship, so the score climbs as the work lands. The engine finds the issue. AI explains the review.

Perpetual design engine

New review judgments are authored and refined every week. As the engine encodes more of how senior designers think, every project it reviews gets sharper automatically, without you changing a thing.

Eight reviewers, one per discipline

Accessibility, color, type, spacing, motion, components, UX, and craft each review every PR with their own rules, the way a real design team splits the work.

Grounded in your actual code

Contrast ratios are calculated from real hex and token values, and every finding quotes the line it came from. Two passes: fast triage, then a deep, line-level review of the highest-risk files.

Every finding ships with a fix

Issues are severity-rated and arrive with an inline suggestion you can commit straight from the pull request. No context-switching.

## AI gives you an opinion. Rams keeps score.

Opinions are useful once. Scores become operational. Every review produces a consistent design score across PRs, repos, and releases, so teams track design quality over time instead of debating one-off opinions.

Verified fixes

Re-reviews check every finding you fixed, by name. The score climbs as the work lands, and a clean pass says so: all flagged issues resolved.

![](https://www.rams.ai/illo/illo_checks.svg)

A number you can trust

The same 313 rules on every review, and criticals cap the score — one holds it to 59, two to 49, three or more to 39. A 60 or above always means zero critical issues.

![](https://www.rams.ai/illo/illonumbers.svg)

The whole team’s gate

Every pull request from every contributor gets reviewed, humans and agents alike. Nobody has to install anything.

![](https://www.rams.ai/illo/illo_gate.svg)

The honest comparison: [Rams vs design skills](https://www.rams.ai/compare/rams-vs-design-skills)

## The standards your product relies on.

Accessibility findings map to named W3C requirements, not house opinion. When Rams flags contrast, a missing label, or unguarded motion, it is pointing at the standard behind the call.

W3CWCAG 2.1 AA

Contrast

Contrast, labels, focus order, and heading structure: the quiet failures that lock real people out of your product.

W3C · WAIWAI-ARIA

Semantics

Roles, names, and states on every interactive element, so assistive tech can announce each control your users reach for.

W3C · CSSprefers-reduced-motion

Motion

Animation that ignores motion preferences: the unguarded transitions and autoplay that leave motion-sensitive users dizzy or unwell.

W3CWCAG 2.2

Targets

Target size and focus appearance: the newest criteria, checked before most teams have adopted them.

W3C · WAIWAI-APG

Keyboard

How dialogs, menus, and tabs should behave for keyboard users, from focus trap to escape key.

![Cory Etzkorn](https://www.rams.ai/_next/image?url=%2Fcory.jpg&w=256&q=75&dpl=dpl_XiwGgSqurtRERaX3S7qanMJvhkr6)

“Rams brings the missing piece to AI tooling: taste.”

Cory Etzkorn · Founder at Soulmate,

previously Design Engineer at Notion

## Start free. Upgrade later.

Free on public repos. Flat monthly tiers from $39, no per-seat fees. Every tier runs the full engine.

### Free

For trying Rams on your open-source work. One public repo, no credit card, no commitment. Just install and go.

$0

No card required

[Install free](https://www.rams.ai/auth/signup)

GitHub App on 1 public repo

30 reviews to try it, PRs + MCP

The full 313-rule engine

Inline one-click fix suggestions

Re-reviews that verify your fixes

Score history in the dashboard

MCP API keys included

### Solo

For your next big idea or side project. One private repository at a time, with the full review on every pull request.

$33/mo

Billed yearly

[Get started](https://www.rams.ai/auth/signup?plan=solo&period=annual)

GitHub App on 1 private repo

50 reviews / month, PRs + MCP

The full 313-rule engine

Inline one-click fix suggestions

Re-reviews that verify your fixes

Score history in the dashboard

Standard support

### Studio

For one person shipping across a lot of repos. Every project you own, reviewed on every pull request.

$149/mo

Billed yearly

[Get started](https://www.rams.ai/auth/signup?plan=studio&period=annual)

Unlimited public & private repos

Unlimited team, no per-seat fees

300 reviews / month, PRs + MCP

The full 313-rule engine

Inline one-click fix suggestions

Re-reviews that verify your fixes

Score history in the dashboard

Email support

### Team

Popular

For teams shipping real product. Unlimited repos, unlimited people, one flat price. Go over and it keeps working.

$399/mo

Billed yearly

[Start a 14-day trial](https://www.rams.ai/auth/signup?plan=team&period=annual&trial=1)

Blocking: critical findings fail the PR check

Reviews on every PR — 500 / month included, then $0.90

Unlimited public & private repos

Unlimited team, no per-seat fees

The full 313-rule engine

Inline one-click fix suggestions

Re-reviews that verify your fixes

Monthly design-drift report

Priority support

### Gate

Early access

Nothing off-system ships. We encode your design system by hand and enforce it on every pull request — a service with the engine inside, for a few teams a quarter.

$999/mo base

Scoped on a call

[Request access](https://www.rams.ai/gate?src=pricing)

Blocking on your rules: your design system as the bar

Blocking: critical findings fail the PR check

Reviews on every PR — 500 / month included

Your tokens and patterns as enforceable rules, ramped one at a time

Rules your coding agent reads before it writes

Before and after renders as proof

Monthly receipt of what it kept out

Unlimited repos and team, no per-seat fees

Hand-built with your team

Review pack · $24 one time

25 reviews at $0.96 each, no subscription. Credits never expire and work on any plan. For launch weeks and backlog sweeps.

[Buy a pack](https://www.rams.ai/app/settings)

Enterprise · Custom

For the whole organization. Custom rules, SSO, dedicated SLA.

[Contact us](mailto:rams@rams.ai)

## Catch design regressions before your users do.

Score your repo free in about two minutes, no account. Or install Rams and every pull request gets the review.

[Score my repo for free](https://www.rams.ai/scores/new) [Install Rams](https://www.rams.ai/auth/signup)

[![Rams](https://www.rams.ai/logos/logo-rams-lockup.svg)](https://www.rams.ai/)

Product

- [MCP](https://www.rams.ai/mcp)
- [Skill](https://www.rams.ai/skill)
- [GitHub](https://www.rams.ai/github)
- [Action](https://www.rams.ai/action)
- [Agents](https://www.rams.ai/agents)
- [Scores](https://www.rams.ai/scores)
- [Rules](https://www.rams.ai/rules)
- [FAQ](https://www.rams.ai/faq)
- [Setup](https://www.rams.ai/setup)
- [Demo](https://www.rams.ai/demo)
- [Status](https://www.rams.ai/status)

Company

- [Privacy](https://www.rams.ai/privacy)
- [Terms](https://www.rams.ai/terms)
- [Security](https://www.rams.ai/security)
- Cookies
- [Contact](mailto:rams@rams.ai)

Guides

- [Frontend design review](https://www.rams.ai/guides/frontend-design-review)
- [UI code review tools](https://www.rams.ai/guides/ui-code-review-tools)
- [AI-generated UI quality](https://www.rams.ai/guides/ai-generated-ui-quality)

Frameworks

- [Rams for React](https://www.rams.ai/frameworks/react)
- [Rams for Next.js](https://www.rams.ai/frameworks/nextjs)
- [Rams for SwiftUI](https://www.rams.ai/frameworks/swiftui)
- [Rams for Vue.js](https://www.rams.ai/frameworks/vue)
- [Rams for Svelte](https://www.rams.ai/frameworks/svelte)
- [Rams for Angular](https://www.rams.ai/frameworks/angular)
- [Rams for Tailwind CSS](https://www.rams.ai/frameworks/tailwindcss)

Compare

- [Rams vs ESLint](https://www.rams.ai/compare/rams-vs-eslint)
- [Rams vs axe](https://www.rams.ai/compare/rams-vs-axe)
- [Rams vs CodeRabbit](https://www.rams.ai/compare/rams-vs-coderabbit)
- [Rams vs Greptile](https://www.rams.ai/compare/rams-vs-greptile)
- [Rams vs Lighthouse](https://www.rams.ai/compare/rams-vs-lighthouse)
- [Rams vs Design skills](https://www.rams.ai/compare/rams-vs-design-skills)

[© HSLA0001 Inc. 2026](https://hsla0001.com/)