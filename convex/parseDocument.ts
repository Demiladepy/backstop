import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  type ActionCtx,
} from "./_generated/server";
import { parseWithFirecrawl, extractPlainDocumentText, safeExternalError } from "./externalApi";

async function ownerFromAuth(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }
  return identity.tokenIdentifier;
}

async function run(
  ctx: ActionCtx,
  documentId: Id<"documents">,
  ownerId: string,
): Promise<Id<"sources"> | null> {
  const job = await ctx.runQuery(internal.workflowModel.getDocumentJob, {
    documentId,
    ownerId,
  });
  if (!job) {
    throw new ConvexError("Document or stored file not found");
  }

  const operationId = `firecrawl:parse:${documentId}:${crypto.randomUUID()}`;
  const shouldRun = await ctx.runMutation(internal.workflowModel.beginParse, {
    documentId,
    ownerId,
    operationId,
  });
  if (!shouldRun) {
    return null;
  }

  try {
    const storageResponse = await fetch(job.storageUrl);
    if (!storageResponse.ok) {
      throw new Error(`Convex storage returned HTTP ${storageResponse.status}`);
    }
    const blob = await storageResponse.blob();
    let markdown: string;
    try {
      markdown = await parseWithFirecrawl(
        blob,
        job.document.fileName,
        job.document.mimeType,
      );
    } catch (firecrawlError) {
      const fallback = await extractPlainDocumentText(
        blob,
        job.document.mimeType,
        job.document.fileName,
      );
      if (!fallback) {
        throw firecrawlError;
      }
      markdown = fallback;
    }
    return await ctx.runMutation(internal.workflowModel.completeParse, {
      documentId,
      ownerId,
      operationId,
      markdown,
    });
  } catch (error) {
    const message = safeExternalError(error);
    await ctx.runMutation(internal.workflowModel.failParse, {
      documentId,
      ownerId,
      operationId,
      error: message,
    });
    throw new ConvexError(message);
  }
}

export const parseDocument = action({
  args: { documentId: v.id("documents") },
  returns: v.union(v.id("sources"), v.null()),
  handler: async (ctx, args) => {
    return await run(ctx, args.documentId, await ownerFromAuth(ctx));
  },
});

export const runParseDocument = internalAction({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
  },
  returns: v.union(v.id("sources"), v.null()),
  handler: async (ctx, args) => {
    return await run(ctx, args.documentId, args.ownerId);
  },
});
