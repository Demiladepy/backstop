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

/** Stable public pages used when live search is thin or scrape-heavy. */
export const CURATED_POLICY_URLS = [
  {
    url: "https://www.medicare.gov/coverage/magnetic-resonance-imaging-mri",
    title: "Medicare coverage: Magnetic Resonance Imaging (MRI)",
  },
  {
    url: "https://www.medicare.gov/claims-appeals/file-an-appeal",
    title: "Medicare: File an appeal",
  },
  {
    url: "https://www.cms.gov/medicare/appeals-and-grievances/orgmedprocsappeals",
    title: "CMS: Original Medicare appeals",
  },
  {
    url: "https://www.aetna.com/cpb/medical/data/1_99/0095.html",
    title: "Aetna Clinical Policy Bulletin: Magnetic Resonance Imaging",
  },
] as const;

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
  return CURATED_POLICY_URLS.filter((row) => {
    if (wantsImaging) return true;
    return !/mri|magnetic-resonance/i.test(row.url);
  });
}
