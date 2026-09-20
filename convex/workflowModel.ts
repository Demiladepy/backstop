import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import schema, { draftParagraph, sourceVerification } from "./schema";

const MAX_SOURCE_CONTENT = 500_000;
const MAX_POLICY_SOURCES = 10;
const MAX_DRAFT_PARAGRAPHS = 64;

const policySourceInput = v.object({
  title: v.string(),
  url: v.string(),
  publisher: v.optional(v.string()),
  content: v.string(),
  excerpt: v.string(),
  quotedText: v.string(),
  relevanceNote: v.string(),
  verification: sourceVerification,
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
    if (parsingDocuments.length === 0) {
      await ctx.scheduler.runAfter(0, internal.findPolicy.runFindPolicy, {
        caseId: document.caseId,
        ownerId: args.ownerId,
      });
    }
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
    const existingAppeal = await ctx.db
      .query("drafts")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .filter((q) => q.eq(q.field("kind"), "appeal"))
      .first();
    // Mirror failResearch: only refuse once the owner has moved past research,
    // not merely because the case slipped into "drafting". Discarding a
    // successful scrape here is what leaves an appeal with no policy sources.
    const pastResearch =
      caseRow.status === "awaiting_approval" ||
      caseRow.status === "approved" ||
      caseRow.status === "sent" ||
      caseRow.status === "awaiting_reply" ||
      caseRow.status === "resolved" ||
      caseRow.status === "closed" ||
      (caseRow.status === "drafting" && existingAppeal !== null);
    if (pastResearch) {
      const now = Date.now();
      await ctx.db.insert("auditLog", {
        caseId: args.caseId,
        ownerId: args.ownerId,
        actor: "system",
        event: "external.firecrawl.policy_research",
        operationId: args.operationId,
        status: "failed",
        entityType: "case",
        entityId: args.caseId,
        detail: `Late research ignored; case already ${caseRow.status}.`.slice(
          0,
          1_000,
        ),
        createdAt: now,
      });
      return [];
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
        !source.quotedText.trim() ||
        !source.relevanceNote.trim() ||
        !source.content.includes(source.quotedText.trim()) ||
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
          quotedText: source.quotedText.trim().slice(0, 4_000),
          relevanceNote: source.relevanceNote.trim().slice(0, 1_000),
          verification: source.verification,
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
    await ctx.scheduler.runAfter(0, internal.draftAppeal.runDraftAppeal, {
      caseId: args.caseId,
      ownerId: args.ownerId,
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
    const existingAppeal = await ctx.db
      .query("drafts")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .filter((q) => q.eq(q.field("kind"), "appeal"))
      .first();
    const pastResearch =
      caseRow.status === "awaiting_approval" ||
      caseRow.status === "approved" ||
      caseRow.status === "sent" ||
      caseRow.status === "awaiting_reply" ||
      caseRow.status === "resolved" ||
      caseRow.status === "closed" ||
      (caseRow.status === "drafting" && existingAppeal !== null);

    // A slow research job may finish after the owner already approved/sent.
    // Do not clobber that progress or spawn a second appeal draft.
    if (pastResearch) {
      await ctx.db.insert("auditLog", {
        caseId: args.caseId,
        ownerId: args.ownerId,
        actor: "system",
        event: "external.firecrawl.policy_research",
        operationId: args.operationId,
        status: "failed",
        entityType: "case",
        entityId: args.caseId,
        detail: `Late research ignored; case already ${caseRow.status}. ${args.error}`.slice(
          0,
          1_000,
        ),
        createdAt: now,
      });
      return null;
    }

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
    const documentSource = await ctx.db
      .query("sources")
      .withIndex("by_caseId_and_kind", (q) =>
        q.eq("caseId", args.caseId).eq("kind", "document"),
      )
      .first();
    if (documentSource && !existingAppeal) {
      await ctx.scheduler.runAfter(0, internal.draftAppeal.runDraftAppeal, {
        caseId: args.caseId,
        ownerId: args.ownerId,
      });
    }
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
    const priorAppeal = await ctx.db
      .query("drafts")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .filter((q) => q.eq(q.field("kind"), "appeal"))
      .first();
    // Drafting now would flip the case out of "researching", and the policy
    // sources would land too late to be cited. Research chains into drafting
    // on its own (via completeResearch or failResearch), so wait for it.
    if (caseRow.status === "researching" && !priorAppeal) {
      fail(
        "Policy research is still running. The appeal drafts automatically as soon as it finishes.",
      );
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

export const upsertMonitor = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    kind: v.union(
      v.literal("deadline"),
      v.literal("policy_watch"),
      v.literal("form_watch"),
    ),
    targetUrl: v.optional(v.string()),
    firecrawlMonitorId: v.optional(v.string()),
    operationId: v.string(),
    detail: v.string(),
  },
  returns: v.id("monitors"),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    const existing = (
      await ctx.db
        .query("monitors")
        .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
        .take(25)
    ).find((row) => row.kind === args.kind && row.status === "active");
    const now = Date.now();
    const monitorId =
      existing?._id ??
      (await ctx.db.insert("monitors", {
        caseId: args.caseId,
        ownerId: args.ownerId,
        kind: args.kind,
        status: "active",
        targetUrl: args.targetUrl,
        firecrawlMonitorId: args.firecrawlMonitorId,
        nextCheckAt: now + 6 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      }));
    if (existing) {
      await ctx.db.patch("monitors", existing._id, {
        targetUrl: args.targetUrl ?? existing.targetUrl,
        firecrawlMonitorId:
          args.firecrawlMonitorId ?? existing.firecrawlMonitorId,
        status: "active",
        error: undefined,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.monitor",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "monitor",
      entityId: monitorId,
      detail: args.detail,
      createdAt: now,
    });
    return monitorId;
  },
});

export const listActiveMonitors = internalQuery({
  args: {},
  returns: v.array(schema.doc("monitors")),
  handler: async (ctx) => {
    return await ctx.db
      .query("monitors")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(50);
  },
});

export const recordMonitorCheck = internalMutation({
  args: {
    monitorId: v.id("monitors"),
    ownerId: v.string(),
    operationId: v.string(),
    changed: v.boolean(),
    summary: v.string(),
    snapshot: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const monitor = await ctx.db.get("monitors", args.monitorId);
    if (!monitor || monitor.ownerId !== args.ownerId) return null;
    const now = Date.now();
    await ctx.db.patch("monitors", monitor._id, {
      lastCheckedAt: now,
      lastChangeAt: args.changed ? now : monitor.lastChangeAt,
      lastChangeSummary: args.summary,
      lastSnapshot: args.snapshot ?? monitor.lastSnapshot,
      nextCheckAt: now + 6 * 60 * 60 * 1000,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: monitor.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.monitor",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "monitor",
      entityId: monitor._id,
      detail: args.summary,
      createdAt: now,
    });
    return null;
  },
});

export const completeFormFill = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    subject: v.string(),
    body: v.string(),
    sourceUrl: v.string(),
    fallback: v.boolean(),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      fail("Case not found");
    }
    const now = Date.now();
    const text = args.body.startsWith("[UNVERIFIED]")
      ? args.body
      : `[UNVERIFIED] ${args.body}`;
    const draftId = await ctx.db.insert("drafts", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      kind: "form_submission",
      status: "pending_approval",
      subject: args.subject.slice(0, 300),
      paragraphs: [
        {
          text,
          sourceIds: [],
          verification: "unverified",
        },
      ],
      body: text,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: "external.firecrawl.interact",
      operationId: args.operationId,
      status: "succeeded",
      entityType: "draft",
      entityId: draftId,
      detail: args.fallback
        ? `Recorded fallback form fill for ${args.sourceUrl}. Submit was not attempted.`
        : `Public form filled up to submit for ${args.sourceUrl}. Submit was not attempted.`,
      createdAt: now,
    });
    return draftId;
  },
});

export const failExternalDepth = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    operationId: v.string(),
    event: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("auditLog", {
      caseId: args.caseId,
      ownerId: args.ownerId,
      actor: "system",
      event: args.event,
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
