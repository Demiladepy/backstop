import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import schema, { caseCategory, draftParagraph } from "./schema";

const MAX_LIST = 100;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/html",
  "text/csv",
  "text/plain",
]);

function resolveDocumentMimeType(
  contentType: string | null | undefined,
  fileName: string,
) {
  const declared = contentType?.split(";")[0]?.trim().toLowerCase();
  if (declared && SUPPORTED_MIME_TYPES.has(declared)) {
    return declared;
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return declared || "application/octet-stream";
}

async function requireOwner(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }
  return identity.tokenIdentifier;
}

function boundedLimit(limit: number | undefined, fallback: number) {
  const value = limit ?? fallback;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIST) {
    throw new ConvexError(`limit must be an integer from 1 to ${MAX_LIST}`);
  }
  return value;
}

export const listCases = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(schema.doc("cases")),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    return await ctx.db
      .query("cases")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .take(boundedLimit(args.limit, 50));
  },
});

export const getCase = query({
  args: { caseId: v.id("cases") },
  returns: v.union(
    v.null(),
    v.object({
      case: schema.doc("cases"),
      documents: v.array(schema.doc("documents")),
      sources: v.array(schema.doc("sources")),
      drafts: v.array(schema.doc("drafts")),
      messages: v.array(schema.doc("messages")),
      audit: v.array(schema.doc("auditLog")),
      monitors: v.array(schema.doc("monitors")),
    }),
  ),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== ownerId) {
      return null;
    }

    const [documents, sources, drafts, messages, audit, monitors] =
      await Promise.all([
        ctx.db
          .query("documents")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(50),
        ctx.db
          .query("sources")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(20),
        ctx.db
          .query("drafts")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(25),
        ctx.db
          .query("messages")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(50),
        ctx.db
          .query("auditLog")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(100),
        ctx.db
          .query("monitors")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .order("desc")
          .take(25),
      ]);

    return {
      case: caseRow,
      documents,
      sources,
      drafts,
      messages,
      audit,
      monitors,
    };
  },
});

export const pendingApprovals = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(schema.doc("drafts")),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    return await ctx.db
      .query("drafts")
      .withIndex("by_ownerId_and_status", (q) =>
        q.eq("ownerId", ownerId).eq("status", "pending_approval"),
      )
      .order("desc")
      .take(boundedLimit(args.limit, 50));
  },
});

export const createCase = mutation({
  args: {
    title: v.string(),
    category: caseCategory,
    counterpartyName: v.optional(v.string()),
    counterpartyEmail: v.optional(v.string()),
    deadlineAt: v.optional(v.number()),
  },
  returns: v.id("cases"),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 160) {
      throw new ConvexError("title must contain 3 to 160 characters");
    }
    const counterpartyName = args.counterpartyName?.trim();
    if (counterpartyName && counterpartyName.length > 160) {
      throw new ConvexError("counterpartyName must be at most 160 characters");
    }
    const counterpartyEmail = args.counterpartyEmail?.trim().toLowerCase();
    if (
      counterpartyEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterpartyEmail)
    ) {
      throw new ConvexError("counterpartyEmail must be a valid email address");
    }

    const now = Date.now();
    const caseId = await ctx.db.insert("cases", {
      ownerId,
      title,
      category: args.category,
      status: "intake",
      counterpartyName: counterpartyName || undefined,
      counterpartyEmail: counterpartyEmail || undefined,
      deadlineAt: args.deadlineAt,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId,
      ownerId,
      actor: "user",
      event: "case.created",
      operationId: `case:create:${caseId}`,
      status: "succeeded",
      entityType: "case",
      entityId: caseId,
      detail: "Case created.",
      createdAt: now,
    });
    return caseId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Demo helper: set a near-term appeals deadline when intake left it blank. */
export const ensureDemoDeadline = mutation({
  args: { caseId: v.id("cases") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== ownerId) {
      throw new ConvexError("Case not found");
    }
    if (caseRow.deadlineAt) {
      return caseRow.deadlineAt;
    }
    const deadlineAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    await ctx.db.patch("cases", caseRow._id, {
      deadlineAt,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: caseRow._id,
      ownerId,
      actor: "user",
      event: "demo.deadline_set",
      operationId: `demo:deadline:${caseRow._id}`,
      status: "succeeded",
      entityType: "case",
      entityId: caseRow._id,
      detail: "Demo appeals deadline set 14 days out.",
      createdAt: now,
    });
    return deadlineAt;
  },
});

export const attachDocument = mutation({
  args: {
    caseId: v.id("cases"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    kind: v.optional(
      v.union(
        v.literal("denial_letter"),
        v.literal("bill"),
        v.literal("eob"),
        v.literal("policy"),
      ),
    ),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== ownerId) {
      throw new ConvexError("Case not found");
    }
    if (
      caseRow.status === "awaiting_approval" ||
      caseRow.status === "approved" ||
      caseRow.status === "closed"
    ) {
      throw new ConvexError("Documents cannot be attached to this case state");
    }

    const existing = await ctx.db
      .query("documents")
      .withIndex("by_ownerId_and_storageId", (q) =>
        q.eq("ownerId", ownerId).eq("storageId", args.storageId),
      )
      .unique();
    if (existing) {
      if (existing.caseId !== args.caseId) {
        throw new ConvexError("Uploaded file is already attached elsewhere");
      }
      return existing._id;
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new ConvexError("Uploaded file was not found");
    }
    const fileName = args.fileName.trim();
    if (!fileName || fileName.length > 255) {
      throw new ConvexError("fileName must contain 1 to 255 characters");
    }
    const mimeType = resolveDocumentMimeType(
      metadata.contentType,
      fileName,
    );
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new ConvexError(`Unsupported document type: ${mimeType}`);
    }
    if (metadata.size > MAX_FILE_BYTES) {
      throw new ConvexError("Document exceeds the 25 MB upload limit");
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      caseId: args.caseId,
      ownerId,
      storageId: args.storageId,
      kind: args.kind,
      fileName,
      mimeType,
      size: metadata.size,
      status: "attached",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("cases", args.caseId, {
      status: "parsing",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId,
      actor: "user",
      event: "document.attached",
      operationId: `document:attach:${documentId}`,
      status: "succeeded",
      entityType: "document",
      entityId: documentId,
      detail: `Attached ${fileName}${args.kind ? ` (${args.kind})` : ""}; parsing scheduled.`,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.parseDocument.runParseDocument,
      { documentId, ownerId },
    );
    return documentId;
  },
});

export const approveDraft = mutation({
  args: { draftId: v.id("drafts") },
  returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== ownerId) {
      throw new ConvexError("Draft not found");
    }
    if (draft.status === "approved") {
      return draft._id;
    }
    if (draft.status !== "pending_approval") {
      throw new ConvexError(`Cannot approve a ${draft.status} draft`);
    }
    const caseRow = await ctx.db.get("cases", draft.caseId);
    if (!caseRow || caseRow.ownerId !== ownerId) {
      throw new ConvexError("Case not found");
    }
    if (!caseRow.counterpartyName || !caseRow.counterpartyEmail) {
      throw new ConvexError(
        "Payer name and email are required before approving a sendable appeal",
      );
    }

    const sourceIds = new Set(
      (
        await ctx.db
          .query("sources")
          .withIndex("by_caseId", (q) => q.eq("caseId", draft.caseId))
          .take(20)
      ).map((source) => source._id),
    );
    for (const paragraph of draft.paragraphs) {
      const validCitations = paragraph.sourceIds.every((id) =>
        sourceIds.has(id),
      );
      if (
        (paragraph.verification === "cited" &&
          paragraph.sourceIds.length === 0) ||
        !validCitations
      ) {
        throw new ConvexError("Draft contains an invalid or cross-case citation");
      }
      if (
        paragraph.verification === "unverified" &&
        !paragraph.text.startsWith("[UNVERIFIED]")
      ) {
        throw new ConvexError("Unverified draft text is not visibly marked");
      }
    }

    const now = Date.now();
    await ctx.db.patch("drafts", draft._id, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("cases", draft.caseId, {
      status: "approved",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId,
      actor: "user",
      event: "draft.approved",
      operationId: `draft:approve:${draft._id}`,
      status: "succeeded",
      entityType: "draft",
      entityId: draft._id,
      detail:
        draft.kind === "form_submission"
          ? "Public form fill approved. Submit remains with the human."
          : "Draft approved by its owner. Email send was scheduled.",
      createdAt: now,
    });
    if (draft.kind === "form_submission") {
      // Form fills stop before submit even after approval.
    } else if (draft.kind === "appeal") {
      await ctx.scheduler.runAfter(0, internal.email.sendApprovedDraft, {
        draftId: draft._id,
        ownerId,
      });
    }
    return draft._id;
  },
});

export const editDraft = mutation({
  args: {
    draftId: v.id("drafts"),
    subject: v.string(),
    paragraphs: v.array(draftParagraph),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== ownerId) {
      throw new ConvexError("Draft not found");
    }
    if (draft.status !== "pending_approval") {
      throw new ConvexError(`Cannot edit a ${draft.status} draft`);
    }
    const subject = args.subject.trim();
    if (!subject || subject.length > 300) {
      throw new ConvexError("subject must contain 1 to 300 characters");
    }
    if (args.paragraphs.length < 1 || args.paragraphs.length > 64) {
      throw new ConvexError("draft must contain 1 to 64 paragraphs");
    }
    const sourceIds = new Set(
      (
        await ctx.db
          .query("sources")
          .withIndex("by_caseId", (q) => q.eq("caseId", draft.caseId))
          .take(20)
      ).map((source) => source._id),
    );
    for (const paragraph of args.paragraphs) {
      if (!paragraph.text.trim()) {
        throw new ConvexError("Draft paragraphs cannot be empty");
      }
      if (
        paragraph.verification === "cited" &&
        (paragraph.sourceIds.length === 0 ||
          !paragraph.sourceIds.every((id) => sourceIds.has(id)))
      ) {
        throw new ConvexError("Draft contains an invalid or cross-case citation");
      }
      if (
        paragraph.verification === "unverified" &&
        (!paragraph.text.startsWith("[UNVERIFIED]") ||
          paragraph.sourceIds.length !== 0)
      ) {
        throw new ConvexError(
          "Unverified draft text must stay visibly marked and uncited",
        );
      }
    }

    const now = Date.now();
    await ctx.db.patch("drafts", draft._id, {
      subject,
      paragraphs: args.paragraphs.map((paragraph) => ({
        ...paragraph,
        text: paragraph.text.trim(),
      })),
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId,
      actor: "user",
      event: "draft.edited",
      operationId: `draft:edit:${draft._id}:${now}`,
      status: "succeeded",
      entityType: "draft",
      entityId: draft._id,
      detail: "Pending appeal draft edited; citations and verification retained.",
      createdAt: now,
    });
    return draft._id;
  },
});

export const rejectDraft = mutation({
  args: {
    draftId: v.id("drafts"),
    reason: v.string(),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const ownerId = await requireOwner(ctx);
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== ownerId) {
      throw new ConvexError("Draft not found");
    }
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new ConvexError("reason must contain 3 to 500 characters");
    }
    if (draft.status === "rejected" && draft.rejectionReason === reason) {
      return draft._id;
    }
    if (draft.status !== "pending_approval") {
      throw new ConvexError(`Cannot reject a ${draft.status} draft`);
    }

    const now = Date.now();
    await ctx.db.patch("drafts", draft._id, {
      status: "rejected",
      rejectedAt: now,
      rejectionReason: reason,
      updatedAt: now,
    });
    await ctx.db.patch("cases", draft.caseId, {
      status: "drafting",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId,
      actor: "user",
      event: "draft.rejected",
      operationId: `draft:reject:${draft._id}`,
      status: "succeeded",
      entityType: "draft",
      entityId: draft._id,
      detail: reason,
      createdAt: now,
    });
    return draft._id;
  },
});
