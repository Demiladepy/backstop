import { FirecrawlScrape } from "convex-firecrawl-scrape";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import {
  createStructuredResponse,
  firecrawlKey,
  safeExternalError,
  searchWithFirecrawl,
} from "./externalApi";

const clauseSchema = {
  type: "object",
  properties: {
    quotedText: { type: "string", minLength: 20, maxLength: 4_000 },
    relevanceNote: { type: "string", minLength: 1, maxLength: 1_000 },
  },
  required: ["quotedText", "relevanceNote"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

async function extractPolicyClause(content: string, denialExcerpt: string) {
  const text = await createStructuredResponse(
    [
      {
        role: "system",
        content:
          "Extract one exact, contiguous, verbatim quote from the supplied policy page that is most relevant to the fictional denial. Do not paraphrase the quote and do not invent language. Explain relevance separately.",
      },
      {
        role: "user",
        content: JSON.stringify({
          denialExcerpt,
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
  const quotedText = row.quotedText.trim();
  const relevanceNote = row.relevanceNote.trim();
  if (!content.includes(quotedText)) {
    throw new Error("Extracted clause was not an exact quote from the source");
  }
  return { quotedText, relevanceNote };
}

async function scrapePolicy(ctx: ActionCtx, url: string) {
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
  for (let attempt = 0; attempt < 90; attempt += 1) {
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
    const ownerId = identity.tokenIdentifier;
    const context: {
      case: Doc<"cases">;
      sources: Doc<"sources">[];
    } | null = await ctx.runQuery(internal.workflowModel.getCaseContext, {
      caseId: args.caseId,
      ownerId,
    });
    if (!context) {
      throw new ConvexError("Case not found");
    }
    const focus = args.focus?.trim();
    if (focus && focus.length > 300) {
      throw new ConvexError("focus must be at most 300 characters");
    }

    const operationId = `firecrawl:policy:${args.caseId}:${crypto.randomUUID()}`;
    await ctx.runMutation(internal.workflowModel.beginResearch, {
      caseId: args.caseId,
      ownerId,
      operationId,
    });

    try {
      const documentExcerpt =
        context.sources.find((source) => source.kind === "document")?.excerpt ??
        "";
      const query = [
        context.case.title,
        context.case.counterpartyName,
        context.case.category.replaceAll("_", " "),
        focus,
        documentExcerpt.slice(0, 500),
        "insurance policy appeal coverage criteria official",
      ]
        .filter(Boolean)
        .join(" ");
      const results = await searchWithFirecrawl(query.slice(0, 500));
      const settled = await Promise.allSettled(
        results.slice(0, 5).map(async (result) => {
          const scraped = await scrapePolicy(ctx, result.url);
          const clause = await extractPolicyClause(
            scraped.markdown,
            documentExcerpt,
          );
          return {
            title: scraped.title ?? result.title,
            url: result.url,
            publisher: scraped.publisher,
            content: scraped.markdown.slice(0, 500_000),
            excerpt: clause.quotedText.slice(0, 1_500),
            quotedText: clause.quotedText,
            relevanceNote: clause.relevanceNote,
          };
        }),
      );
      const sources = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (sources.length === 0) {
        const firstFailure = settled.find(
          (result) => result.status === "rejected",
        );
        throw new Error(
          firstFailure?.status === "rejected"
            ? safeExternalError(firstFailure.reason)
            : "Firecrawl returned no scrapeable policy sources",
        );
      }
      return await ctx.runMutation(internal.workflowModel.completeResearch, {
        caseId: args.caseId,
        ownerId,
        operationId,
        sources,
      });
    } catch (error) {
      const message = safeExternalError(error);
      await ctx.runMutation(internal.workflowModel.failResearch, {
        caseId: args.caseId,
        ownerId,
        operationId,
        error: message,
      });
      throw new ConvexError(message);
    }
  },
});
