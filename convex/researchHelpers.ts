/** Pure helpers for policy research query building and quote matching. */

const TRUSTED_HOST_SUFFIXES = [
  "cms.gov",
  "medicare.gov",
  "healthcare.gov",
  "nih.gov",
  "hhs.gov",
  "aetna.com",
  "cigna.com",
  "uhc.com",
  "unitedhealthcare.com",
  "anthem.com",
  "bluecross.com",
  "bcbs.com",
  "humana.com",
  "kaiserpermanente.org",
] as const;

/**
 * Stable public pages used when live search is thin or scrape-heavy.
 * Every URL here must return 200 for a plain GET; a rotted URL silently
 * becomes a "policy source" that is really an error page, so re-verify
 * this list before any demo or release.
 */
export type CuratedPolicyUrl = {
  readonly url: string;
  readonly title: string;
  /** Only offered when the denial concerns imaging. */
  readonly imaging?: boolean;
};

export const CURATED_POLICY_URLS: readonly CuratedPolicyUrl[] = [
  {
    url: "https://www.medicare.gov/coverage/diagnostic-tests",
    title: "Medicare coverage: Diagnostic tests and imaging",
    imaging: true,
  },
  {
    url: "https://www.cms.gov/medicare/coverage/determination-process",
    title: "CMS: Medicare coverage determination process",
    imaging: true,
  },
  {
    url: "https://www.medicare.gov/claims-appeals/how-do-i-file-an-appeal",
    title: "Medicare: How do I file an appeal?",
  },
  {
    url: "https://www.healthcare.gov/appeal-insurance-company-decision/internal-appeals/",
    title: "HealthCare.gov: Internal appeals",
  },
  {
    url: "https://www.healthcare.gov/appeal-insurance-company-decision/external-review/",
    title: "HealthCare.gov: External review",
  },
];

/**
 * Markers that a scraped page is an error, block, or interstitial rather than
 * policy text. Firecrawl returns soft 404s with a 200-shaped result, so a
 * scrape that "succeeds" can still carry a Not Found body. Without this check
 * that body becomes a citable source and the appeal quotes an error page.
 */
const ERROR_PAGE_PATTERNS: readonly RegExp[] = [
  /page not found/i,
  /page (?:could|can) ?not be found/i,
  /page you (?:are|were) looking for/i,
  /page that matches your entry/i,
  /\berror 40[34]\b/i,
  /\bhttp 40[34]\b/i,
  /\b40[34] (?:error|not found|forbidden)\b/i,
  /access denied/i,
  /\bforbidden\b/i,
  /request blocked/i,
  /temporarily unavailable/i,
  /service unavailable/i,
  /enable javascript/i,
  /are you a (?:human|robot)/i,
  /verify you are human/i,
];

/** Below this, a "policy page" is too thin to have quotable policy language. */
export const MIN_POLICY_CONTENT_CHARS = 600;

/**
 * Error pages announce themselves in the title and opening lines, so only the
 * head of the document is scanned. Matching the whole body would reject real
 * policy pages that happen to mention "not found" further down.
 */
export function looksLikeErrorPage(content: string, title?: string): boolean {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length < MIN_POLICY_CONTENT_CHARS) {
    return true;
  }
  const head = `${title ?? ""} ${collapsed.slice(0, 1_200)}`;
  return ERROR_PAGE_PATTERNS.some((pattern) => pattern.test(head));
}

export function normalizeForQuoteMatch(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Prefer an exact substring; fall back to whitespace-normalized containment. */
export function findExactQuoteInContent(
  content: string,
  quotedText: string,
): string | null {
  const quote = quotedText.trim();
  if (quote.length >= 20 && content.includes(quote)) {
    return quote;
  }
  const normalizedContent = normalizeForQuoteMatch(content);
  const normalizedQuote = normalizeForQuoteMatch(quote);
  if (normalizedQuote.length < 20 || !normalizedContent.includes(normalizedQuote)) {
    return null;
  }
  const words = quote.split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return null;
  }
  const startWord = words[0]!;
  const endWord = words[words.length - 1]!;
  const startIdx = content.search(new RegExp(escapeRegExp(startWord), "i"));
  if (startIdx < 0) {
    return null;
  }
  const afterStart = content.slice(startIdx);
  const endMatch = afterStart.search(new RegExp(escapeRegExp(endWord), "i"));
  if (endMatch < 0) {
    return null;
  }
  const candidate = afterStart.slice(0, endMatch + endWord.length).trim();
  if (normalizeForQuoteMatch(candidate) !== normalizedQuote) {
    return null;
  }
  return content.includes(candidate) ? candidate : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** When OpenAI paraphrase fails, take a long contiguous excerpt from the page. */
export function pickFallbackExcerpt(content: string, minLength = 120): string | null {
  const paragraphs = content
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= minLength);
  const best = paragraphs.sort((a, b) => b.length - a.length)[0];
  if (best && content.includes(best)) {
    return best.slice(0, 1_500);
  }
  const compact = content.trim();
  if (compact.length < minLength) {
    return null;
  }
  const slice = compact.slice(0, 1_200);
  return content.includes(slice) ? slice : null;
}

export function extractDenialSignals(excerpt: string) {
  const lower = excerpt.toLowerCase();
  const signals: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bmri\b/, "MRI"],
    [/lumbar|spine|spinal/, "lumbar spine"],
    [/conservative treatment|physical therapy|conservative care/, "conservative treatment"],
    [/medical.?necessity|medically necessary/, "medical necessity"],
    [/prior authorization|preauthorization/, "prior authorization"],
    [/outpatient/, "outpatient"],
    [/appeal/, "appeal"],
  ];
  for (const [pattern, label] of patterns) {
    if (pattern.test(lower)) {
      signals.push(label);
    }
  }
  return signals;
}

export function buildPolicySearchQueries(args: {
  title: string;
  payer: string;
  category: string;
  focus?: string;
  documentExcerpt: string;
}): string[] {
  const signals = extractDenialSignals(args.documentExcerpt);
  const payer = args.payer
    .replace(/\(.*?\)/g, "")
    .replace(/fictional|demo|sample/gi, "")
    .trim();
  const service = signals.find((s) => /mri|spine|imaging/i.test(s)) ?? "advanced imaging";
  const reason =
    signals.find((s) => /conservative|medical necessity|prior auth/i.test(s)) ??
    "medical necessity criteria";
  const focus = args.focus?.trim();

  const queries = [
    focus,
    `${payer} clinical policy ${service} ${reason}`.trim(),
    `${service} ${reason} coverage criteria insurance policy official`,
    `site:cms.gov OR site:medicare.gov ${service} coverage`,
    `${payer} medical necessity ${service} policy bulletin`,
    `${args.title} ${reason} appeal coverage criteria`.slice(0, 200),
  ]
    .filter((query): query is string => Boolean(query && query.trim().length >= 12))
    .map((query) => query.replace(/\s+/g, " ").trim().slice(0, 500));

  return [...new Set(queries)].slice(0, 5);
}

export function scorePolicyUrl(url: string, payer: string): number {
  let score = 0;
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return -10;
  }
  if (host.endsWith(".gov")) score += 8;
  for (const suffix of TRUSTED_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) {
      score += 6;
      break;
    }
  }
  const payerToken = payer
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)[0];
  if (payerToken && payerToken.length > 2 && host.includes(payerToken)) {
    score += 5;
  }
  if (/policy|coverage|cpb|lcd|ncd|medical-necessity|appeals/i.test(url)) {
    score += 2;
  }
  if (/blog|news|reddit|facebook|twitter|linkedin|youtube/i.test(host)) {
    score -= 6;
  }
  return score;
}

export function curatedCandidatesForDenial(documentExcerpt: string) {
  const signals = extractDenialSignals(documentExcerpt);
  const wantsImaging = signals.some((s) => /mri|spine|imaging/i.test(s));
  return CURATED_POLICY_URLS.filter((row) => wantsImaging || !row.imaging);
}
