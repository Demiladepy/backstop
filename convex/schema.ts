import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const caseCategory = v.literal("medical_denial");

export const caseStatus = v.union(
  v.literal("intake"),
  v.literal("parsing"),
  v.literal("researching"),
  v.literal("drafting"),
  v.literal("awaiting_approval"),
  v.literal("approved"),
  v.literal("sent"),
  v.literal("awaiting_reply"),
  v.literal("resolved"),
  v.literal("closed"),
  v.literal("error"),
);

export const documentStatus = v.union(
  v.literal("attached"),
  v.literal("parsing"),
  v.literal("parsed"),
  v.literal("failed"),
);

export const draftStatus = v.union(
  v.literal("drafting"),
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("sent"),
);

export const draftParagraph = v.object({
  text: v.string(),
  sourceIds: v.array(v.id("sources")),
  verification: v.union(v.literal("cited"), v.literal("unverified")),
});

export default defineSchema({
  ...authTables,
  cases: defineTable({
    ownerId: v.string(),
    title: v.string(),
    category: caseCategory,
    status: caseStatus,
    counterpartyName: v.optional(v.string()),
    counterpartyEmail: v.optional(v.string()),
    agentMailInboxId: v.optional(v.string()),
    agentMailInboxEmail: v.optional(v.string()),
    deadlineAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_status", ["ownerId", "status"])
    .index("by_agentMailInboxId", ["agentMailInboxId"]),

  documents: defineTable({
    caseId: v.id("cases"),
    ownerId: v.string(),
    storageId: v.id("_storage"),
    kind: v.optional(
      v.union(
        v.literal("denial_letter"),
        v.literal("bill"),
        v.literal("eob"),
        v.literal("policy"),
      ),
    ),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    status: documentStatus,
    extractedText: v.optional(v.string()),
    parsedJson: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_status", ["caseId", "status"])
    .index("by_ownerId_and_storageId", ["ownerId", "storageId"]),

  sources: defineTable({
    caseId: v.id("cases"),
    ownerId: v.string(),
    documentId: v.optional(v.id("documents")),
    kind: v.union(v.literal("document"), v.literal("policy")),
    title: v.string(),
    url: v.optional(v.string()),
    publisher: v.optional(v.string()),
    content: v.string(),
    excerpt: v.string(),
    quotedText: v.optional(v.string()),
    relevanceNote: v.optional(v.string()),
    retrievedAt: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_kind", ["caseId", "kind"])
    .index("by_documentId_and_kind", ["documentId", "kind"]),

  drafts: defineTable({
    caseId: v.id("cases"),
    ownerId: v.string(),
    kind: v.literal("appeal"),
    status: draftStatus,
    subject: v.string(),
    paragraphs: v.array(draftParagraph),
    body: v.optional(v.string()),
    citationIds: v.optional(v.array(v.id("sources"))),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_status", ["caseId", "status"])
    .index("by_ownerId_and_status", ["ownerId", "status"]),

  messages: defineTable({
    caseId: v.id("cases"),
    ownerId: v.string(),
    draftId: v.optional(v.id("drafts")),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    channel: v.union(v.literal("email"), v.literal("system")),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("received"),
      v.literal("failed"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    agentMailMessageId: v.optional(v.string()),
    agentMailOutboundId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_status", ["caseId", "status"])
    .index("by_draftId", ["draftId"])
    .index("by_agentMailOutboundId", ["agentMailOutboundId"])
    .index("by_agentMailMessageId", ["agentMailMessageId"]),

  auditLog: defineTable({
    caseId: v.optional(v.id("cases")),
    ownerId: v.string(),
    actor: v.union(
      v.literal("user"),
      v.literal("agent"),
      v.literal("system"),
    ),
    event: v.string(),
    operationId: v.string(),
    status: v.union(
      v.literal("started"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    entityType: v.union(
      v.literal("case"),
      v.literal("document"),
      v.literal("source"),
      v.literal("draft"),
      v.literal("message"),
      v.literal("monitor"),
    ),
    entityId: v.string(),
    detail: v.string(),
    createdAt: v.number(),
  })
    .index("by_caseId", ["caseId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_operationId", ["operationId"]),

  monitors: defineTable({
    caseId: v.id("cases"),
    ownerId: v.string(),
    kind: v.union(v.literal("reply"), v.literal("deadline")),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    lastCheckedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_caseId_and_status", ["caseId", "status"])
    .index("by_ownerId_and_status", ["ownerId", "status"]),
});
