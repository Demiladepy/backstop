import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
  safeExternalError,
  scrapeWithFirecrawl,
  searchWithFirecrawl,
} from "./externalApi";

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
          const scraped = await scrapeWithFirecrawl(result.url);
          return {
            title: scraped.title ?? result.title,
            url: result.url,
            publisher: scraped.publisher,
            content: scraped.markdown.slice(0, 500_000),
            excerpt: (
              result.description || scraped.markdown.slice(0, 1_500)
            ).slice(0, 1_500),
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
