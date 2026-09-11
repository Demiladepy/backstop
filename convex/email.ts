import { AgentMail, vOutboundId } from "@agentmail/convex";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import schema from "./schema";

export const agentmail: AgentMail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.email.onMessageReceived,
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown>, ...names: string[]) {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

export const getSendContext = internalQuery({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      draft: schema.doc("drafts"),
      case: schema.doc("cases"),
      alreadyQueued: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== args.ownerId) return null;
    const caseRow = await ctx.db.get("cases", draft.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) return null;
    const message = await ctx.db
      .query("messages")
      .withIndex("by_draftId", (q) => q.eq("draftId", draft._id))
      .first();
    return { draft, case: caseRow, alreadyQueued: message !== null };
  },
});

export const storeInbox = internalMutation({
  args: {
    caseId: v.id("cases"),
    ownerId: v.string(),
    inboxId: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      throw new ConvexError("Case not found");
    }
    if (caseRow.agentMailInboxId && caseRow.agentMailInboxId !== args.inboxId) {
      throw new ConvexError("Case inbox is already configured");
    }
    await ctx.db.patch("cases", caseRow._id, {
      agentMailInboxId: args.inboxId,
      agentMailInboxEmail: args.email,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const enqueueApprovedDraft = internalMutation({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
    inboxId: v.string(),
    inboxEmail: v.string(),
  },
  returns: v.union(vOutboundId, v.null()),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== args.ownerId) {
      throw new ConvexError("Draft not found");
    }
    const caseRow = await ctx.db.get("cases", draft.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      throw new ConvexError("Case not found");
    }
    if (draft.status === "sent") return null;
    if (draft.status !== "approved") {
      throw new ConvexError("Only an approved draft can be sent");
    }
    if (!caseRow.counterpartyEmail) {
      throw new ConvexError("Counterparty email is required before sending");
    }
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_draftId", (q) => q.eq("draftId", draft._id))
      .first();
    if (existing) return null;

    const body = draft.paragraphs.map((paragraph) => paragraph.text).join("\n\n");
    const outboundId = await agentmail.sendMessage(ctx, args.inboxId, {
      to: caseRow.counterpartyEmail,
      subject: draft.subject,
      text: body,
      labels: ["backstop", `case-${draft.caseId}`],
    });
    const now = Date.now();
    await ctx.db.insert("messages", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      draftId: draft._id,
      direction: "outbound",
      channel: "email",
      status: "sent",
      subject: draft.subject,
      body,
      agentMailOutboundId: outboundId,
      from: args.inboxEmail,
      to: caseRow.counterpartyEmail,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("drafts", draft._id, {
      status: "sent",
      body,
      updatedAt: now,
    });
    await ctx.db.patch("cases", draft.caseId, {
      status: "awaiting_reply",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      actor: "agent",
      event: "external.agentmail.send_queued",
      operationId: `agentmail:send:${draft._id}`,
      status: "succeeded",
      entityType: "message",
      entityId: outboundId,
      detail: "Approved appeal queued for durable AgentMail delivery.",
      createdAt: now,
    });
    return outboundId;
  },
});

export const recordSendFailure = internalMutation({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== args.ownerId) return null;
    const now = Date.now();
    await ctx.db.patch("cases", draft.caseId, {
      status: "error",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      actor: "agent",
      event: "external.agentmail.send",
      operationId: `agentmail:send:${draft._id}`,
      status: "failed",
      entityType: "draft",
      entityId: draft._id,
      detail: args.error.slice(0, 1_000),
      createdAt: now,
    });
    return null;
  },
});

export const sendApprovedDraft = internalAction({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const context = await ctx.runQuery(internal.email.getSendContext, args);
      if (!context || context.alreadyQueued || context.draft.status === "sent") {
        return null;
      }
      if (context.draft.status !== "approved") {
        throw new ConvexError("Only an approved draft can be sent");
      }
      let inboxId = context.case.agentMailInboxId;
      let inboxEmail = context.case.agentMailInboxEmail;
      if (!inboxId || !inboxEmail) {
        const value: unknown = await agentmail.createInbox(ctx, {
          displayName: "Backstop",
          clientId: `backstop-${context.case._id}`,
        });
        const inbox = asRecord(value);
        inboxId = inbox ? stringField(inbox, "inbox_id", "inboxId") : undefined;
        inboxEmail = inbox ? stringField(inbox, "email") : undefined;
        if (!inboxId || !inboxEmail) {
          throw new Error("AgentMail did not return an inbox ID and email");
        }
        await ctx.runMutation(internal.email.storeInbox, {
          caseId: context.case._id,
          ownerId: args.ownerId,
          inboxId,
          email: inboxEmail,
        });
      }
      await ctx.runMutation(internal.email.enqueueApprovedDraft, {
        draftId: args.draftId,
        ownerId: args.ownerId,
        inboxId,
        inboxEmail,
      });
      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 1_000) : "AgentMail send failed";
      await ctx.runMutation(internal.email.recordSendFailure, {
        draftId: args.draftId,
        ownerId: args.ownerId,
        error: message,
      });
      throw error;
    }
  },
});

export const onMessageReceived = internalMutation({
  args: {
    message: v.any(),
    thread: v.any(),
    eventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = asRecord(args.message);
    if (!message) return null;
    const inboxId = stringField(message, "inbox_id", "inboxId");
    const messageId = stringField(message, "message_id", "messageId");
    if (!inboxId || !messageId) return null;
    const caseRow = await ctx.db
      .query("cases")
      .withIndex("by_agentMailInboxId", (q) =>
        q.eq("agentMailInboxId", inboxId),
      )
      .unique();
    if (!caseRow) return null;
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_agentMailMessageId", (q) =>
        q.eq("agentMailMessageId", messageId),
      )
      .unique();
    if (existing) return null;

    const thread = asRecord(args.thread);
    const now = Date.now();
    const subject = stringField(message, "subject");
    const body =
      stringField(message, "text", "extracted_text", "preview") ??
      "Inbound message received without a text body.";
    await ctx.db.insert("messages", {
      caseId: caseRow._id,
      ownerId: caseRow.ownerId,
      direction: "inbound",
      channel: "email",
      status: "received",
      subject,
      body,
      agentMailMessageId: messageId,
      threadId:
        stringField(message, "thread_id", "threadId") ??
        (thread ? stringField(thread, "thread_id", "threadId") : undefined),
      from: stringField(message, "from"),
      to: caseRow.agentMailInboxEmail,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: caseRow._id,
      ownerId: caseRow.ownerId,
      actor: "system",
      event: "external.agentmail.inbound_received",
      operationId: `agentmail:webhook:${args.eventId}`,
      status: "succeeded",
      entityType: "message",
      entityId: messageId,
      detail: "Verified AgentMail webhook persisted an inbound reply.",
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.replyDraft.proposeFollowUp, {
      caseId: caseRow._id,
      ownerId: caseRow.ownerId,
      inboundSubject: subject,
      inboundBody: body,
    });
    return null;
  },
});

export const listThread = query({
  args: { caseId: v.id("cases") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== identity.tokenIdentifier) {
      throw new ConvexError("Case not found");
    }
    if (!caseRow.agentMailInboxId) return [];
    return await ctx.runQuery(components.agentmail.lib.listInboundMessages, {
      inboxId: caseRow.agentMailInboxId,
    });
  },
});
