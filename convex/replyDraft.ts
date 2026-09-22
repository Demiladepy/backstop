import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { createStructuredResponse, safeExternalError } from "./externalApi";
import { regroundForRejection } from "./findPolicy";

/**
 * The sentence in an insurer reply that states why they said no, or null if
 * the reply is not a rejection. Kept deliberately literal: it becomes the
 * search focus for re-grounding, and a wrong focus only costs a weaker search.
 */
export function extractRejectionReason(body: string): string | null {
  const text = body.replace(/\s+/g, " ").trim();
  if (!/\b(upheld|uphold|denied|deny|denial stands|not approved|rejected|reject)\b/i.test(text)) {
    return null;
  }
  const sentences = text.split(/(?<=[.!?])\s+/);
  const reason =
    sentences.find((s) => /\b(because|requires?|required|must|criteria|not (?:met|documented|shown))\b/i.test(s)) ??
    sentences.find((s) => /\b(upheld|denied|rejected|not approved)\b/i.test(s));
  return reason ? reason.slice(0, 300) : null;
}

const responseSchema = {
  type: "object",
  properties: {
    subject: { type: "string", minLength: 1, maxLength: 300 },
    paragraphs: {
      type: "array",
      minItems: 1,
      maxItems: 32,
      items: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 1 },
          sourceIds: { type: "array", items: { type: "string" } },
        },
        required: ["text", "sourceIds"],
        additionalProperties: false,
      },
    },
  },
  required: ["subject", "paragraphs"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

export const proposeFollowUp = internalAction({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    inboundSubject: v.optional(v.string()),
    inboundBody: v.string(),
  },
  returns: v.union(v.id("drafts"), v.null()),
  handler: async (ctx, args): Promise<Id<"drafts"> | null> => {
    const operationId = `openai:reply:${args.caseId}:${crypto.randomUUID()}`;
    const rejectionReason = extractRejectionReason(args.inboundBody);
    // Break-and-repair: a rejection names a reason, so go find evidence
    // aimed at that reason before answering it. Never blocks the draft.
    const regroundedIds = rejectionReason
      ? await regroundForRejection(ctx, {
          caseId: args.caseId,
          ownerId: args.ownerId,
          focus: rejectionReason,
        })
      : [];
    const fresh = new Set<string>(regroundedIds);
    try {
      const context = await ctx.runQuery(
        internal.workflowModel.getCaseContext,
        { caseId: args.caseId, ownerId: args.ownerId },
      );
      if (!context || context.sources.length === 0) return null;
      await ctx.runMutation(internal.workflowModel.beginDraft, {
        caseId: args.caseId,
        ownerId: args.ownerId,
        operationId,
      });
      const text = await createStructuredResponse(
        [
          {
            role: "system",
            content: rejectionReason
              ? "The insurer rejected the appeal. Write a calm counter-draft for human approval that answers their stated reason directly, point by point. Prefer sources marked newlyRetrieved:true, which were fetched to answer this rejection. Only cite sources marked citable:true, using their exact IDs. Return an empty sourceIds array for anything you cannot support; it will be labelled unverified. Never claim it was sent. Not legal or medical advice."
              : "Propose a concise follow-up email for human approval after an insurer reply. Never claim it was sent. Every factual paragraph must use only supplied source IDs marked citable:true. Return an empty sourceIds array for unsupported language.",
          },
          {
            role: "user",
            content: JSON.stringify({
              reply: {
                subject: args.inboundSubject ?? null,
                body: args.inboundBody.slice(0, 12_000),
              },
              statedRejectionReason: rejectionReason,
              sources: context.sources.map((source) => ({
                id: source._id,
                title: source.title,
                excerpt: source.quotedText ?? source.excerpt,
                citable: source.verification !== "unverified",
                newlyRetrieved: fresh.has(source._id),
              })),
            }),
          },
        ],
        responseSchema,
      );
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("OpenAI follow-up output was not an object");
      }
      const output = parsed as {
        subject?: unknown;
        paragraphs?: unknown;
      };
      if (
        typeof output.subject !== "string" ||
        !Array.isArray(output.paragraphs)
      ) {
        throw new Error("OpenAI follow-up output was incomplete");
      }
      // An excerpt that could not be matched verbatim never supports a claim.
      const validSources = new Set(
        context.sources
          .filter((source) => source.verification !== "unverified")
          .map((source) => source._id),
      );
      const paragraphs = output.paragraphs.map((value) => {
        const row =
          typeof value === "object" && value !== null
            ? (value as Record<string, unknown>)
            : {};
        const body = typeof row.text === "string" ? row.text.trim() : "";
        const requested = Array.isArray(row.sourceIds)
          ? row.sourceIds.filter((id): id is string => typeof id === "string")
          : [];
        const ids = requested.filter((id): id is Id<"sources"> =>
          validSources.has(id as Id<"sources">),
        );
        return body &&
          ids.length > 0 &&
          ids.length === requested.length
          ? { text: body, sourceIds: ids, verification: "cited" as const }
          : {
              text: `[UNVERIFIED] ${body || "A response is needed."}`,
              sourceIds: [] as Id<"sources">[],
              verification: "unverified" as const,
            };
      });
      return await ctx.runMutation(internal.workflowModel.completeDraft, {
        caseId: args.caseId,
        ownerId: args.ownerId,
        operationId,
        subject: output.subject,
        paragraphs,
      });
    } catch (error) {
      const message = safeExternalError(error);
      await ctx.runMutation(internal.workflowModel.failDraft, {
        caseId: args.caseId,
        ownerId: args.ownerId,
        operationId,
        error: message,
      });
      return null;
    }
  },
});
