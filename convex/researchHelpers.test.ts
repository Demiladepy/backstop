import { describe, expect, test } from "vitest";
import {
  buildPolicySearchQueries,
  findExactQuoteInContent,
  pickFallbackExcerpt,
  scorePolicyUrl,
} from "./researchHelpers";

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
        "https://www.medicare.gov/coverage/magnetic-resonance-imaging-mri",
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
