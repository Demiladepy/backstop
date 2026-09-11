import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import schema, { draftParagraph } from "./schema";

const MAX_SOURCE_CONTENT = 500_000;
const MAX_POLICY_SOURCES = 10;
const MAX_DRAFT_PARAGRAPHS = 64;

const policySourceInput = v.object({
  title: v.string(),
  url: v.string(),
  publisher: v.optional(v.string()),
  content: v.string(),
  excerpt: v.string(),
});

function fail(message: string): never {
  throw new ConvexError(message);
}

export const getDocumentJob = internalQuery({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      document: schema.doc("documents"),
      case: schema.doc("cases"),
      storageUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.ownerId !== args.ownerId) {
      return null;
    }
    const caseRow = await ctx.db.get("cases", document.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      return null;
    }
    const storageUrl = await ctx.storage.getUrl(document.storageId);
    if (!storageUrl) {
      return null;
    }
    return { document, case: caseRow, storageUrl };
  },
});

export const getCaseContext = internalQuery({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      case: schema.doc("cases"),
      sources: v.array(schema.doc("sources")),
    }),
  ),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      return null;
    }
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .take(20);
    return { case: caseRow, sources };
  },
});

export const beginParse = internalMutation({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.ownerId !== args.ownerId) {
      fail("Document not found");
    }
    if (document.status === "parsed" || document.status === "parsing") {
      return false;
    }
    if (document.status !== "attached" && document.status !== "failed") {
      fail(`Cannot parse a ${document.status} document`);
    }
    const now = Date.now();
    await ctx.db.patch("documents", document._id, {
      status: "parsing",
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch("cases", document.caseId, {
      status: "parsing",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: document.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.parse",
      operationId: args.operationId,
      status: "started",
      entityType: "document",
      entityId: document._id,
      detail: "Firecrawl document parse started.",
      createdAt: now,
    });
    return true;
  },
});

export const completeParse = internalMutation({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
    operationId: v.string(),
    markdown: v.string(),
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    if (!args.markdown.trim() || args.markdown.length > MAX_SOURCE_CONTENT) {
      fail("Parsed document text is empty or exceeds the storage limit");
    }
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.ownerId !== args.ownerId) {
      fail("Document not found");
    }
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_documentId_and_kind", (q) =>
        q.eq("documentId", document._id).eq("kind", "document"),
      )
      .unique();
    if (document.status === "parsed" && existing) {
      return existing._id;
    }
    if (document.status !== "parsing") {
      fail(`Cannot complete parsing from ${document.status}`);
    }

    const now = Date.now();
    const markdown = args.markdown.trim();
    const sourceId =
      existing?._id ??
      (await ctx.db.insert("sources", {
        caseId: document.caseId,
        ownerId: args.ownerId,
        documentId: document._id,
        kind: "document",
        title: document.fileName,
        content: markdown,
        excerpt: markdown.slice(0, 1_500),
        retrievedAt: now,
      }));
    await ctx.db.patch("documents", document._id, {
      status: "parsed",
      extractedText: markdown,
      error: undefined,
      updatedAt: now,
    });
    const parsingDocuments = await ctx.db
      .query("documents")
      .withIndex("by_caseId_and_status", (q) =>
        q.eq("caseId", document.caseId).eq("status", "parsing"),
      )
      .take(2);
    await ctx.db.patch("cases", document.caseId, {
      status: parsingDocuments.length > 0 ? "parsing" : "researching",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: document.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.parse",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "source",
      entityId: sourceId,
      detail: "Firecrawl parse persisted as a document source.",
      createdAt: now,
    });
    return sourceId;
  },
});

export const failParse = internalMutation({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
    operationId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.ownerId !== args.ownerId) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch("documents", document._id, {
      status: "failed",
      error: args.error,
      updatedAt: now,
    });
    await ctx.db.patch("cases", document.caseId, {
      status: "error",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: document.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.parse",
      operationId: args.operationId,
      status: "failed",
      entityType: "document",
      entityId: document._id,
      detail: args.error,
      createdAt: now,
    });
    return null;
  },
});

export const beginResearch = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    if (
      caseRow.status !== "researching" &&
      caseRow.status !== "error" &&
      caseRow.status !== "drafting"
    ) {
      fail(`Cannot research a case in ${caseRow.status}`);
    }
    const documentSource = await ctx.db
      .query("sources")
      .withIndex("by_caseId_and_kind", (q) =>
        q.eq("caseId", args.caseId).eq("kind", "document"),
      )
      .first();
    if (!documentSource) {
      fail("Parse a case document before researching policy");
    }
    const now = Date.now();
    await ctx.db.patch("cases", args.caseId, {
      status: "researching",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.policy_research",
      operationId: args.operationId,
      status: "started",
      entityType: "case",
      entityId: args.caseId,
      detail: "Firecrawl policy search and scrape started.",
      createdAt: now,
    });
    return null;
  },
});

export const completeResearch = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    sources: v.array(policySourceInput),
  },
  returns: v.array(v.id("sources")),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    if (caseRow.status !== "researching") {
      fail(`Cannot persist research from ${caseRow.status}`);
    }
    if (args.sources.length < 1 || args.sources.length > MAX_POLICY_SOURCES) {
      fail(`Research must contain 1 to ${MAX_POLICY_SOURCES} policy sources`);
    }

    const now = Date.now();
    const sourceIds: Id<"sources">[] = [];
    for (const source of args.sources) {
      if (
        !source.title.trim() ||
        !source.url.startsWith("http") ||
        !source.content.trim() ||
        source.content.length > MAX_SOURCE_CONTENT
      ) {
        fail("Policy source has invalid or oversized content");
      }
      sourceIds.push(
        await ctx.db.insert("sources", {
          caseId: args.caseId,
          ownerId: args.ownerId,
          kind: "policy",
          title: source.title.trim(),
          url: source.url,
          publisher: source.publisher?.trim() || undefined,
          content: source.content.trim(),
          excerpt: source.excerpt.trim().slice(0, 1_500),
          retrievedAt: now,
        }),
      );
    }
    await ctx.db.patch("cases", args.caseId, {
      status: "drafting",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.policy_research",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "case",
      entityId: args.caseId,
      detail: `Persisted ${sourceIds.length} scraped policy sources.`,
      createdAt: now,
    });
    return sourceIds;
  },
});

export const failResearch = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch("cases", args.caseId, {
      status: "error",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.policy_research",
      operationId: args.operationId,
      status: "failed",
      entityType: "case",
      entityId: args.caseId,
      detail: args.error,
      createdAt: now,
    });
    return null;
  },
});

export const beginDraft = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    if (
      caseRow.status !== "drafting" &&
      caseRow.status !== "researching" &&
      caseRow.status !== "awaiting_reply" &&
      caseRow.status !== "error"
    ) {
      fail(`Cannot draft an appeal from ${caseRow.status}`);
    }
    const source = await ctx.db
      .query("sources")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .first();
    if (!source) {
      fail("At least one stored source is required before drafting");
    }
    const now = Date.now();
    await ctx.db.patch("cases", args.caseId, {
      status: "drafting",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.openai.draft_appeal",
      operationId: args.operationId,
      status: "started",
      entityType: "case",
      entityId: args.caseId,
      detail: "OpenAI appeal drafting started.",
      createdAt: now,
    });
    return null;
  },
});

export const completeDraft = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    subject: v.string(),
    paragraphs: v.array(draftParagraph),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    if (caseRow.status !== "drafting") {
      fail(`Cannot persist a draft from ${caseRow.status}`);
    }
    if (
      !args.subject.trim() ||
      args.paragraphs.length < 1 ||
      args.paragraphs.length > MAX_DRAFT_PARAGRAPHS
    ) {
      fail(`Draft must contain a subject and 1 to ${MAX_DRAFT_PARAGRAPHS} paragraphs`);
    }
    const caseSources = new Set(
      (
        await ctx.db
          .query("sources")
          .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
          .take(20)
      ).map((source) => source._id),
    );
    for (const paragraph of args.paragraphs) {
      if (
        paragraph.verification === "cited" &&
        (paragraph.sourceIds.length === 0 ||
          !paragraph.sourceIds.every((id) => caseSources.has(id)))
      ) {
        fail("A cited paragraph references a missing or cross-case source");
      }
      if (
        paragraph.verification === "unverified" &&
        (!paragraph.text.startsWith("[UNVERIFIED]") ||
          paragraph.sourceIds.length !== 0)
      ) {
        fail("Unverified paragraphs must be visibly marked and uncited");
      }
    }

    const now = Date.now();
    const draftId = await ctx.db.insert("drafts", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      kind: "appeal",
      status: "pending_approval",
      subject: args.subject.trim().slice(0, 300),
      paragraphs: args.paragraphs,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("cases", args.caseId, {
      status: "awaiting_approval",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.openai.draft_appeal",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "draft",
      entityId: draftId,
      detail: "OpenAI structured output persisted for human approval.",
      createdAt: now,
    });
    return draftId;
  },
});

export const failDraft = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch("cases", args.caseId, {
      status: "error",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.openai.draft_appeal",
      operationId: args.operationId,
      status: "failed",
      entityType: "case",
      entityId: args.caseId,
      detail: args.error,
      createdAt: now,
    });
    return null;
  },
});
