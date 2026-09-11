import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { createStructuredResponse, safeExternalError } from "./externalApi";

type DraftOutput = {
  subject: string;
  paragraphs: Array<{ text: string; sourceIds: string[] }>;
};

const responseSchema = {
  type: "object",
  properties: {
    subject: { type: "string", minLength: 1, maxLength: 300 },
    paragraphs: {
      type: "array",
      minItems: 1,
      maxItems: 64,
      items: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 1 },
          sourceIds: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["text", "sourceIds"],
        additionalProperties: false,
      },
    },
  },
  required: ["subject", "paragraphs"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

function parseDraftOutput(text: string): DraftOutput {
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null) {
    throw new Error("OpenAI draft output was not an object");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.subject !== "string" ||
    !Array.isArray(record.paragraphs)
  ) {
    throw new Error("OpenAI draft output omitted subject or paragraphs");
  }
  const paragraphs = record.paragraphs.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("OpenAI returned an invalid draft paragraph");
    }
    const paragraph = item as Record<string, unknown>;
    if (
      typeof paragraph.text !== "string" ||
      !Array.isArray(paragraph.sourceIds) ||
      !paragraph.sourceIds.every((id) => typeof id === "string")
    ) {
      throw new Error("OpenAI returned an invalid paragraph citation");
    }
    return {
      text: paragraph.text.trim(),
      sourceIds: paragraph.sourceIds as string[],
    };
  });
  if (
    !record.subject.trim() ||
    paragraphs.length < 1 ||
    paragraphs.length > 64 ||
    paragraphs.some((paragraph) => !paragraph.text)
  ) {
    throw new Error("OpenAI returned an empty or oversized draft");
  }
  return { subject: record.subject, paragraphs };
}

export const draftAppeal = action({
  args: {
    caseId: v.id("cases"),
    instructions: v.optional(v.string()),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args): Promise<Id<"drafts">> => {
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
    const instructions = args.instructions?.trim();
    if (instructions && instructions.length > 2_000) {
      throw new ConvexError("instructions must be at most 2,000 characters");
    }
    if (context.sources.length === 0) {
      throw new ConvexError("At least one parsed or researched source is required");
    }

    const operationId = `openai:draft:${args.caseId}:${crypto.randomUUID()}`;
    await ctx.runMutation(internal.workflowModel.beginDraft, {
      caseId: args.caseId,
      ownerId,
      operationId,
    });

    try {
      const sourceInput = context.sources.map((source) => ({
        id: source._id,
        title: source.title,
        url: source.url ?? null,
        excerpt: source.content.slice(0, 8_000),
      }));
      const outputText = await createStructuredResponse(
        [
          {
            role: "system",
            content:
              "Draft a calm medical insurance appeal for human review. This is not legal or medical advice. Every factual paragraph must cite one or more exact source IDs supplied by the user. Never invent an ID. If a paragraph cannot be supported, return an empty sourceIds array; it will be visibly marked unverified. Do not claim the appeal has been sent.",
          },
          {
            role: "user",
            content: JSON.stringify({
              case: {
                title: context.case.title,
                category: context.case.category,
              },
              instructions: instructions ?? null,
              sources: sourceInput,
            }),
          },
        ],
        responseSchema,
      );
      const output = parseDraftOutput(outputText);
      const sourceIds = new Set(context.sources.map((source) => source._id));
      const paragraphs = output.paragraphs.map((paragraph) => {
        const validIds = paragraph.sourceIds.filter(
          (id): id is Id<"sources"> =>
            sourceIds.has(id as Id<"sources">),
        );
        const allValid =
          validIds.length > 0 &&
          validIds.length === paragraph.sourceIds.length;
        return allValid
          ? {
              text: paragraph.text,
              sourceIds: validIds,
              verification: "cited" as const,
            }
          : {
              text: `[UNVERIFIED] ${paragraph.text}`,
              sourceIds: [] as Id<"sources">[],
              verification: "unverified" as const,
            };
      });
      return await ctx.runMutation(internal.workflowModel.completeDraft, {
        caseId: args.caseId,
        ownerId,
        operationId,
        subject: output.subject,
        paragraphs,
      });
    } catch (error) {
      const message = safeExternalError(error);
      await ctx.runMutation(internal.workflowModel.failDraft, {
        caseId: args.caseId,
        ownerId,
        operationId,
        error: message,
      });
      throw new ConvexError(message);
    }
  },
});
