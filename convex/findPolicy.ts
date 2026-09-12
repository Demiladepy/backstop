import { FirecrawlScrape } from "convex-firecrawl-scrape";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import {
  createStructuredResponse,
  firecrawlKey,
  safeExternalError,
  scrapeWithFirecrawl,
  searchWithFirecrawl,
  type FirecrawlSearchResult,
} from "./externalApi";
import {
  buildPolicySearchQueries,
  curatedCandidatesForDenial,
  findExactQuoteInContent,
  pickFallbackExcerpt,
  scorePolicyUrl,
} from "./researchHelpers";

const TARGET_POLICY_SOURCES = 2;
const MAX_CANDIDATES_TO_TRY = 8;

const clauseSchema = {
  type: "object",
  properties: {
    quotedText: { type: "string", minLength: 20, maxLength: 4_000 },
    relevanceNote: { type: "string", minLength: 1, maxLength: 1_000 },
  },
  required: ["quotedText", "relevanceNote"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

type PolicyCandidate = {
  url: string;
  title: string;
  markdown?: string;
  score: number;
};

type BuiltPolicySource = {
  title: string;
  url: string;
  publisher: string;
  content: string;
  excerpt: string;
  quotedText: string;
  relevanceNote: string;
};

async function extractPolicyClause(content: string, denialExcerpt: string) {
  try {
    const text = await createStructuredResponse(
      [
        {
          role: "system",
          content:
            "Extract one exact, contiguous, verbatim quote from the supplied policy page that is most relevant to the fictional denial. Copy characters exactly from the policy page. Do not paraphrase. Explain relevance separately.",
        },
        {
          role: "user",
          content: JSON.stringify({
            denialExcerpt: denialExcerpt.slice(0, 4_000),
            policyPage: content.slice(0, 80_000),
          }),
        },
      ],
      clauseSchema,
    );
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) {
      throw new Error("OpenAI clause output was not an object");
    }
    const row = value as Record<string, unknown>;
    if (
      typeof row.quotedText !== "string" ||
      typeof row.relevanceNote !== "string"
    ) {
      throw new Error("OpenAI clause output omitted required fields");
    }
    const matched = findExactQuoteInContent(content, row.quotedText);
    if (matched) {
      return {
        quotedText: matched,
        relevanceNote: row.relevanceNote.trim(),
      };
    }
  } catch {
    // Fall through to excerpt selection.
  }

  const fallback = pickFallbackExcerpt(content);
  if (!fallback) {
    throw new Error("Could not derive a verbatim policy excerpt");
  }
  return {
    quotedText: fallback,
    relevanceNote:
      "Selected contiguous excerpt from the retrieved public policy page after exact-quote extraction failed. Verify before relying on it.",
  };
}

async function scrapePolicy(ctx: ActionCtx, url: string) {
  try {
    const sync = await scrapeWithFirecrawl(url);
    return {
      markdown: sync.markdown,
      title: sync.title,
      publisher: new URL(url).hostname,
    };
  } catch {
    // Fall through to the Convex Firecrawl scrape component.
  }

  const client = new FirecrawlScrape(components.firecrawlScrape, {
    FIRECRAWL_API_KEY: firecrawlKey(),
  });
  const mutationCtx =
    ctx as unknown as Parameters<FirecrawlScrape["scrape"]>[0];
  const queryCtx =
    ctx as unknown as Parameters<FirecrawlScrape["getStatus"]>[0];
  const { jobId } = await client.scrape(mutationCtx, url, {
    formats: ["markdown"],
    onlyMainContent: true,
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = await client.getStatus(queryCtx, jobId);
    if (status?.status === "completed") {
      const content = await client.getContent(queryCtx, jobId);
      if (!content?.markdown?.trim()) {
        throw new Error(`Firecrawl scrape for ${url} returned no markdown`);
      }
      const metadata =
        typeof content.metadata === "object" && content.metadata !== null
          ? (content.metadata as Record<string, unknown>)
          : {};
      return {
        markdown: content.markdown,
        title:
          typeof metadata.title === "string" ? metadata.title : undefined,
        publisher: new URL(url).hostname,
      };
    }
    if (status?.status === "failed") {
      throw new Error(status.error ?? `Firecrawl scrape failed for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Firecrawl scrape timed out for ${url}`);
}

function mergeCandidates(
  rows: PolicyCandidate[],
  incoming: PolicyCandidate[],
): PolicyCandidate[] {
  const byUrl = new Map<string, PolicyCandidate>();
  for (const row of [...rows, ...incoming]) {
    const key = row.url.replace(/\/$/, "").toLowerCase();
    const existing = byUrl.get(key);
    if (!existing || row.score > existing.score || (!existing.markdown && row.markdown)) {
      byUrl.set(key, {
        ...existing,
        ...row,
        markdown: row.markdown ?? existing?.markdown,
        score: Math.max(existing?.score ?? -Infinity, row.score),
        title: row.title || existing?.title || row.url,
      });
    }
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score);
}

async function collectCandidates(args: {
  title: string;
  payer: string;
  category: string;
  focus?: string;
  documentExcerpt: string;
}): Promise<PolicyCandidate[]> {
  let candidates: PolicyCandidate[] = curatedCandidatesForDenial(
    args.documentExcerpt,
  ).map((row) => ({
    url: row.url,
    title: row.title,
    score: scorePolicyUrl(row.url, args.payer) + 4,
  }));

  const queries = buildPolicySearchQueries(args);
  for (const query of queries) {
    try {
      const results = await searchWithFirecrawl(query, {
        limit: 5,
        scrapeMarkdown: candidates.filter((c) => c.markdown).length < 2,
      });
      candidates = mergeCandidates(
        candidates,
        results.map((result: FirecrawlSearchResult) => ({
          url: result.url,
          title: result.title,
          markdown: result.markdown,
          score: scorePolicyUrl(result.url, args.payer),
        })),
      );
    } catch {
      // Try the next query; curated URLs remain available.
    }
    if (candidates.length >= MAX_CANDIDATES_TO_TRY) {
      break;
    }
  }

  // Domain-restricted pass when open search stayed thin.
  if (candidates.filter((c) => c.score >= 6).length < 2) {
    try {
      const official = await searchWithFirecrawl(
        `${args.payer} ${extractServiceHint(args.documentExcerpt)} medical necessity policy`,
        {
          limit: 5,
          includeDomains: ["cms.gov", "medicare.gov", "aetna.com"],
          scrapeMarkdown: true,
        },
      );
      candidates = mergeCandidates(
        candidates,
        official.map((result) => ({
          url: result.url,
          title: result.title,
          markdown: result.markdown,
          score: scorePolicyUrl(result.url, args.payer) + 3,
        })),
      );
    } catch {
      // Curated list still covers the demo path.
    }
  }

  return candidates.slice(0, MAX_CANDIDATES_TO_TRY);
}

function extractServiceHint(excerpt: string) {
  const lower = excerpt.toLowerCase();
  if (/\bmri\b/.test(lower)) return "MRI lumbar spine";
  if (/imaging/.test(lower)) return "advanced imaging";
  return "coverage criteria";
}

async function buildSourceFromCandidate(
  ctx: ActionCtx,
  candidate: PolicyCandidate,
  denialExcerpt: string,
): Promise<BuiltPolicySource> {
  const scraped = candidate.markdown?.trim()
    ? {
        markdown: candidate.markdown,
        title: candidate.title,
        publisher: new URL(candidate.url).hostname,
      }
    : await scrapePolicy(ctx, candidate.url);
  const clause = await extractPolicyClause(scraped.markdown, denialExcerpt);
  if (!scraped.markdown.includes(clause.quotedText)) {
    throw new Error(`Quote missing from scraped content for ${candidate.url}`);
  }
  return {
    title: scraped.title ?? candidate.title,
    url: candidate.url,
    publisher: scraped.publisher,
    content: scraped.markdown.slice(0, 500_000),
    excerpt: clause.quotedText.slice(0, 1_500),
    quotedText: clause.quotedText,
    relevanceNote: clause.relevanceNote,
  };
}

async function runResearch(
  ctx: ActionCtx,
  caseId: Id<"cases">,
  ownerId: string,
  focus?: string,
): Promise<Id<"sources">[]> {
  const context: {
    case: Doc<"cases">;
    sources: Doc<"sources">[];
  } | null = await ctx.runQuery(internal.workflowModel.getCaseContext, {
    caseId,
    ownerId,
  });
  if (!context) {
    throw new ConvexError("Case not found");
  }
  const trimmedFocus = focus?.trim();
  if (trimmedFocus && trimmedFocus.length > 300) {
    throw new ConvexError("focus must be at most 300 characters");
  }

  const operationId = `firecrawl:policy:${caseId}:${crypto.randomUUID()}`;
  await ctx.runMutation(internal.workflowModel.beginResearch, {
    caseId,
    ownerId,
    operationId,
  });

  try {
    const documentSource = context.sources.find(
      (source) => source.kind === "document",
    );
    const documentExcerpt =
      documentSource?.excerpt?.trim() ||
      documentSource?.content?.slice(0, 2_000) ||
      "";

    const candidates = await collectCandidates({
      title: context.case.title,
      payer: context.case.counterpartyName ?? "payer",
      category: context.case.category,
      focus: trimmedFocus,
      documentExcerpt,
    });

    const sources: BuiltPolicySource[] = [];
    const errors: string[] = [];
    for (const candidate of candidates) {
      if (sources.length >= TARGET_POLICY_SOURCES) {
        break;
      }
      try {
        sources.push(
          await buildSourceFromCandidate(ctx, candidate, documentExcerpt),
        );
      } catch (error) {
        errors.push(`${candidate.url}: ${safeExternalError(error)}`);
      }
    }

    if (sources.length === 0) {
      throw new Error(
        errors[0] ??
          "Firecrawl returned no scrapeable policy sources after curated and live search",
      );
    }

    return await ctx.runMutation(internal.workflowModel.completeResearch, {
      caseId,
      ownerId,
      operationId,
      sources,
    });
  } catch (error) {
    const message = safeExternalError(error);
    await ctx.runMutation(internal.workflowModel.failResearch, {
      caseId,
      ownerId,
      operationId,
      error: message,
    });
    throw new ConvexError(message);
  }
}

export const findPolicy = action({
  args: {
    caseId: v.id("cases"),
    focus: v.optional(v.string()),
  },
  returns: v.array(v.id("sources")),
  handler: async (ctx, args): Promise<Id<"sources">[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    return await runResearch(
      ctx,
      args.caseId,
      identity.tokenIdentifier,
      args.focus,
    );
  },
});

export const runFindPolicy = internalAction({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    focus: v.optional(v.string()),
  },
  returns: v.union(v.array(v.id("sources")), v.null()),
  handler: async (ctx, args) => {
    try {
      return await runResearch(ctx, args.caseId, args.ownerId, args.focus);
    } catch {
      // Auto-chain continues to draft from document sources after failResearch.
      return null;
    }
  },
});
