import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { createStructuredResponse, safeExternalError } from "./externalApi";

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
            content:
              "Propose a concise follow-up email for human approval after an insurer reply. Never claim it was sent. Every factual paragraph must use only supplied source IDs. Return an empty sourceIds array for unsupported language.",
          },
          {
            role: "user",
            content: JSON.stringify({
              reply: {
                subject: args.inboundSubject ?? null,
                body: args.inboundBody.slice(0, 12_000),
              },
              sources: context.sources.map((source) => ({
                id: source._id,
                title: source.title,
                excerpt: source.excerpt,
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
      const validSources = new Set(context.sources.map((source) => source._id));
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
