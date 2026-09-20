import { describe, expect, test } from "vitest";
import {
  buildPolicySearchQueries,
  CURATED_POLICY_URLS,
  findExactQuoteInContent,
  looksLikeErrorPage,
  pickFallbackExcerpt,
  scorePolicyUrl,
} from "./researchHelpers";

/** Verbatim body Firecrawl returned for the rotted Medicare URL that shipped. */
const MEDICARE_SOFT_404 = `# Error: Page Not Found

We're sorry, but there is no Medicare.gov page that matches your entry. You may have been directed here because:

1. The address you typed contains a typo.
2. The page you are looking for has moved or been removed.
3. The link you followed is out of date.

Try searching Medicare.gov, or return to the homepage to start again. If you keep reaching this page, contact us for help with your Medicare questions and coverage.`;

describe("researchHelpers", () => {
  test("builds short targeted queries from the sample denial", () => {
    const queries = buildPolicySearchQueries({
      title: "Sample denial — outpatient MRI",
      payer: "Aetna (fictional demo)",
      category: "medical_denial",
      documentExcerpt:
        "We denied the requested outpatient MRI because six weeks of conservative treatment were not shown.",
    });
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.some((query) => /Aetna/i.test(query))).toBe(true);
    expect(queries.some((query) => /MRI/i.test(query))).toBe(true);
    expect(queries.every((query) => query.length <= 500)).toBe(true);
  });

  test("scores official policy hosts above blogs", () => {
    expect(
      scorePolicyUrl(
        "https://www.medicare.gov/coverage/diagnostic-tests",
        "Aetna",
      ),
    ).toBeGreaterThan(
      scorePolicyUrl("https://www.reddit.com/r/health/mri", "Aetna"),
    );
    expect(
      scorePolicyUrl("https://www.aetna.com/cpb/medical/data/1_99/0095.html", "Aetna"),
    ).toBeGreaterThan(
      scorePolicyUrl("https://random-news.example/story", "Aetna"),
    );
  });

  test("rejects the soft 404 that previously became a cited source", () => {
    expect(looksLikeErrorPage(MEDICARE_SOFT_404, "Error: Page Not Found")).toBe(
      true,
    );
    // The body alone must be enough — a scrape may carry no title.
    expect(looksLikeErrorPage(MEDICARE_SOFT_404)).toBe(true);
  });

  test("rejects blocked, thin, and interstitial pages", () => {
    expect(looksLikeErrorPage("Access Denied. ".repeat(80))).toBe(true);
    expect(looksLikeErrorPage("Please enable JavaScript to continue. ".repeat(40))).toBe(
      true,
    );
    expect(looksLikeErrorPage("Too short to quote.")).toBe(true);
  });

  test("accepts real policy prose that merely mentions missing pages", () => {
    const policy = `Medicare covers diagnostic non-laboratory tests including magnetic resonance imaging when your treating physician orders them to diagnose or treat a medical condition. Coverage depends on where you get the test and whether the provider accepts assignment. You may need prior authorization for some advanced imaging services. If a claim is denied you have the right to appeal the decision, and the notice you receive explains the deadline that applies to your plan. `.repeat(
      3,
    );
    expect(looksLikeErrorPage(policy, "Diagnostic tests coverage")).toBe(false);
  });

  test("curated policy URLs are absolute https and imaging-tagged where needed", () => {
    expect(CURATED_POLICY_URLS.length).toBeGreaterThan(2);
    for (const row of CURATED_POLICY_URLS) {
      expect(row.url.startsWith("https://")).toBe(true);
      expect(row.title.trim().length).toBeGreaterThan(0);
    }
    expect(CURATED_POLICY_URLS.some((row) => row.imaging)).toBe(true);
    expect(CURATED_POLICY_URLS.some((row) => !row.imaging)).toBe(true);
  });

  test("matches quotes despite whitespace drift", () => {
    const content = "Coverage requires\nsix weeks of conservative treatment first.";
    const quote = "Coverage requires six weeks of conservative treatment first.";
    expect(findExactQuoteInContent(content, quote)).toBeTruthy();
  });

  test("picks a verbatim fallback excerpt", () => {
    const content = [
      "Short",
      "",
      "Medicare may cover an MRI when it is medically necessary and ordered by a doctor who accepts Medicare assignment for the service.",
      "",
      "More.",
    ].join("\n");
    const excerpt = pickFallbackExcerpt(content);
    expect(excerpt).toBeTruthy();
    expect(content.includes(excerpt!)).toBe(true);
  });
});
