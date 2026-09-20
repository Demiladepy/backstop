import { AgentMail } from "@agentmail/convex";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";

export const agentmail: AgentMail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.email.onMessageReceived,
});

const SHARED_INBOX_CLIENT_ID = "backstop-shared";

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

function demoLocalSendAllowed() {
  return process.env.DEMO_ALLOW_LOCAL_SEND === "1";
}

function readInboxIds(value: unknown): {
  inboxId?: string;
  inboxEmail?: string;
} {
  if (
    typeof value === "object" &&
    value !== null &&
    "inboxId" in value &&
    "inboxEmail" in value &&
    typeof (value as { inboxId: unknown }).inboxId === "string" &&
    typeof (value as { inboxEmail: unknown }).inboxEmail === "string"
  ) {
    return {
      inboxId: (value as { inboxId: string }).inboxId,
      inboxEmail: (value as { inboxEmail: string }).inboxEmail,
    };
  }
  const inbox = asRecord(value);
  return {
    inboxId: inbox ? stringField(inbox, "inbox_id", "inboxId", "id") : undefined,
    inboxEmail: inbox ? stringField(inbox, "email") : undefined,
  };
}

function parseInboxList(value: unknown): Array<{ inboxId: string; inboxEmail: string }> {
  const root = asRecord(value);
  const rawList = Array.isArray(value)
    ? value
    : root && Array.isArray(root.inboxes)
      ? root.inboxes
      : root && Array.isArray(root.data)
        ? root.data
        : [];
  const out: Array<{ inboxId: string; inboxEmail: string }> = [];
  for (const item of rawList) {
    const ids = readInboxIds(item);
    if (ids.inboxId && ids.inboxEmail) {
      out.push({ inboxId: ids.inboxId, inboxEmail: ids.inboxEmail });
    }
  }
  return out;
}

async function listInboxesViaHttp() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTMAIL_API_KEY is not set on this Convex deployment");
  }
  const baseUrl = (
    process.env.AGENTMAIL_BASE_URL ?? "https://api.agentmail.to/v0"
  ).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/inboxes?limit=20`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`AgentMail list inboxes failed (${response.status}): ${body}`);
  }
  return parseInboxList(await response.json());
}

async function createInboxViaHttp(clientId: string) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTMAIL_API_KEY is not set on this Convex deployment");
  }
  const baseUrl = (
    process.env.AGENTMAIL_BASE_URL ?? "https://api.agentmail.to/v0"
  ).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/inboxes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      display_name: "Backstop",
      client_id: clientId,
    }),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`AgentMail create inbox failed (${response.status}): ${body}`);
  }
  const created = readInboxIds(await response.json());
  if (!created.inboxId || !created.inboxEmail) {
    throw new Error("AgentMail did not return an inbox ID and email");
  }
  return {
    inboxId: created.inboxId,
    inboxEmail: created.inboxEmail,
  };
}

/**
 * Prefer one shared Backstop inbox (plan caps at a few inboxes).
 * Order: case inbox → env shared → list/reuse → create with stable client_id.
 */
async function ensureCaseInbox(
  ctx: ActionCtx,
  caseRow: Doc<"cases">,
  ownerId: string,
): Promise<{ inboxId: string; inboxEmail: string }> {
  if (caseRow.agentMailInboxId && caseRow.agentMailInboxEmail) {
    return {
      inboxId: caseRow.agentMailInboxId,
      inboxEmail: caseRow.agentMailInboxEmail,
    };
  }

  const sharedId = process.env.AGENTMAIL_SHARED_INBOX_ID?.trim();
  const sharedEmail = process.env.AGENTMAIL_SHARED_INBOX_EMAIL?.trim();
  if (sharedId && sharedEmail) {
    await ctx.runMutation(internal.email.storeInbox, {
      caseId: caseRow._id,
      ownerId,
      inboxId: sharedId,
      email: sharedEmail,
    });
    return { inboxId: sharedId, inboxEmail: sharedEmail };
  }

  let listed: Array<{ inboxId: string; inboxEmail: string }> = [];
  try {
    listed = parseInboxList(await agentmail.listInboxes(ctx, { limit: 20 }));
  } catch {
    try {
      listed = await listInboxesViaHttp();
    } catch {
      listed = [];
    }
  }
  if (listed[0]) {
    await ctx.runMutation(internal.email.storeInbox, {
      caseId: caseRow._id,
      ownerId,
      inboxId: listed[0].inboxId,
      email: listed[0].inboxEmail,
    });
    return listed[0];
  }

  let created: { inboxId: string; inboxEmail: string };
  try {
    const ids = readInboxIds(
      await agentmail.createInbox(ctx, {
        displayName: "Backstop",
        clientId: SHARED_INBOX_CLIENT_ID,
      }),
    );
    if (!ids.inboxId || !ids.inboxEmail) {
      throw new Error("AgentMail createInbox returned incomplete inbox");
    }
    created = { inboxId: ids.inboxId, inboxEmail: ids.inboxEmail };
  } catch (createError) {
    const detail =
      createError instanceof Error ? createError.message : "createInbox failed";
    if (/limit_exceeded|403|Couldn't resolve/i.test(detail)) {
      const viaHttp: Array<{ inboxId: string; inboxEmail: string }> =
        await listInboxesViaHttp().catch(() => []);
      const reusable: { inboxId: string; inboxEmail: string } | undefined =
        viaHttp[0];
      if (reusable) {
        await ctx.runMutation(internal.email.storeInbox, {
          caseId: caseRow._id,
          ownerId,
          inboxId: reusable.inboxId,
          email: reusable.inboxEmail,
        });
        return reusable;
      }
    }
    try {
      created = await createInboxViaHttp(SHARED_INBOX_CLIENT_ID);
    } catch (httpError) {
      const httpDetail =
        httpError instanceof Error ? httpError.message : "http create failed";
      if (/limit_exceeded|403/i.test(httpDetail)) {
        const again = await listInboxesViaHttp();
        if (again[0]) {
          await ctx.runMutation(internal.email.storeInbox, {
            caseId: caseRow._id,
            ownerId,
            inboxId: again[0].inboxId,
            email: again[0].inboxEmail,
          });
          return again[0];
        }
      }
      throw new Error(`${detail} | ${httpDetail}`);
    }
  }

  await ctx.runMutation(internal.email.storeInbox, {
    caseId: caseRow._id,
    ownerId,
    inboxId: created.inboxId,
    email: created.inboxEmail,
  });
  return created;
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

async function sendMessageViaHttp(
  inboxId: string,
  payload: {
    to: string;
    subject: string;
    text: string;
    labels: string[];
  },
) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("AGENTMAIL_API_KEY is not set on this Convex deployment");
  }
  const baseUrl = (
    process.env.AGENTMAIL_BASE_URL ?? "https://api.agentmail.to/v0"
  ).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/inboxes/${inboxId}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      labels: payload.labels,
    }),
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`AgentMail send failed (${response.status}): ${body}`);
  }
  const value: unknown = await response.json();
  const record = asRecord(value);
  const messageId = record
    ? stringField(record, "message_id", "messageId", "id")
    : undefined;
  if (!messageId) {
    throw new Error("AgentMail send did not return a message id");
  }
  const threadId = record
    ? stringField(record, "thread_id", "threadId")
    : undefined;
  return { messageId, threadId };
}

export const enqueueApprovedDraft = internalMutation({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
    inboxId: v.string(),
    inboxEmail: v.string(),
    /** When set, skip component enqueue (app already delivered via HTTP). */
    outboundId: v.optional(v.string()),
    /** AgentMail thread the send landed in; lets replies thread locally. */
    threadId: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
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
    let outboundId = args.outboundId;
    if (!outboundId) {
      outboundId = await agentmail.sendMessage(ctx, args.inboxId, {
        to: caseRow.counterpartyEmail,
        subject: draft.subject,
        text: body,
        labels: ["backstop", `case-${draft.caseId}`],
      });
    }
    const now = Date.now();
    await ctx.db.insert("messages", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      draftId: draft._id,
      direction: "outbound",
      channel: "email",
      status: args.outboundId ? "sent" : "approved",
      subject: draft.subject,
      body,
      agentMailOutboundId: outboundId,
      threadId: args.threadId,
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
      event: args.outboundId
        ? "external.agentmail.send_delivered"
        : "external.agentmail.send_queued",
      operationId: `agentmail:send:${draft._id}`,
      status: "succeeded",
      entityType: "message",
      entityId: outboundId,
      detail: args.outboundId
        ? "Approved appeal delivered via AgentMail HTTP API."
        : "Approved appeal queued for durable AgentMail delivery.",
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

/** Only used when DEMO_ALLOW_LOCAL_SEND=1 — never the prod happy path. */
export const recordLocalDemoSend = internalMutation({
  args: {
    draftId: v.id("drafts"),
    ownerId: v.string(),
    inboxId: v.string(),
    inboxEmail: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get("drafts", args.draftId);
    if (!draft || draft.ownerId !== args.ownerId) return null;
    const caseRow = await ctx.db.get("cases", draft.caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) return null;
    if (draft.status === "sent") return null;
    if (draft.status !== "approved") {
      throw new ConvexError("Only an approved draft can be sent");
    }
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_draftId", (q) => q.eq("draftId", draft._id))
      .first();
    if (existing) return null;

    const body = draft.paragraphs.map((paragraph) => paragraph.text).join("\n\n");
    const now = Date.now();
    const outboundId = `demo-outbound:${draft._id}`;
    await ctx.db.insert("messages", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      draftId: draft._id,
      direction: "outbound",
      channel: "email",
      // Local demo path is an explicit stand-in for delivery, not a claim
      // about AgentMail; it only runs when DEMO_ALLOW_LOCAL_SEND=1.
      status: "sent",
      subject: draft.subject,
      body,
      agentMailOutboundId: outboundId,
      threadId: `demo-thread:${draft.caseId}`,
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
      agentMailInboxId: caseRow.agentMailInboxId ?? args.inboxId,
      agentMailInboxEmail: caseRow.agentMailInboxEmail ?? args.inboxEmail,
      status: "awaiting_reply",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: draft.caseId,
      ownerId: args.ownerId,
      actor: "agent",
      event: "external.agentmail.send",
      operationId: `agentmail:send:${draft._id}`,
      status: "succeeded",
      entityType: "message",
      entityId: outboundId,
      detail: `Local demo outbound recorded after AgentMail send failed: ${args.reason}`,
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
    const context = await ctx.runQuery(internal.email.getSendContext, args);
    if (!context || context.alreadyQueued || context.draft.status === "sent") {
      return null;
    }
    if (context.draft.status !== "approved") {
      throw new ConvexError("Only an approved draft can be sent");
    }

    const failOrDemo = async (reason: string) => {
      if (demoLocalSendAllowed()) {
        await ctx.runMutation(internal.email.recordLocalDemoSend, {
          draftId: args.draftId,
          ownerId: args.ownerId,
          inboxId:
            context.case.agentMailInboxId ?? `demo-inbox:${context.case._id}`,
          inboxEmail:
            context.case.agentMailInboxEmail ??
            `demo-${context.case._id.slice(-8)}@backstop.demo`,
          reason: reason.slice(0, 500),
        });
        return;
      }
      await ctx.runMutation(internal.email.recordSendFailure, {
        draftId: args.draftId,
        ownerId: args.ownerId,
        error: reason.slice(0, 1_000),
      });
      throw new Error(reason);
    };

    try {
      const inbox = await ensureCaseInbox(ctx, context.case, args.ownerId);
      const draftBody = context.draft.paragraphs
        .map((paragraph) => paragraph.text)
        .join("\n\n");
      const to = context.case.counterpartyEmail;
      if (!to) {
        throw new Error("Counterparty email is required before sending");
      }
      try {
        const sent = await sendMessageViaHttp(inbox.inboxId, {
          to,
          subject: context.draft.subject,
          text: draftBody,
          labels: ["backstop", `case-${context.case._id}`],
        });
        await ctx.runMutation(internal.email.enqueueApprovedDraft, {
          draftId: args.draftId,
          ownerId: args.ownerId,
          inboxId: inbox.inboxId,
          inboxEmail: inbox.inboxEmail,
          outboundId: sent.messageId,
          threadId: sent.threadId,
        });
      } catch (httpSendError) {
        // Fall back to component enqueue (may still persist a local outbound).
        await ctx.runMutation(internal.email.enqueueApprovedDraft, {
          draftId: args.draftId,
          ownerId: args.ownerId,
          inboxId: inbox.inboxId,
          inboxEmail: inbox.inboxEmail,
        });
        const detail =
          httpSendError instanceof Error
            ? httpSendError.message
            : "HTTP send failed";
        console.warn(`AgentMail HTTP send failed; used component enqueue: ${detail}`);
      }
      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 1_000) : "AgentMail send failed";
      await failOrDemo(message);
      return null;
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

    // Shared inbox may be attached to many cases — do not use .unique().
    const candidates = await ctx.db
      .query("cases")
      .withIndex("by_agentMailInboxId", (q) =>
        q.eq("agentMailInboxId", inboxId),
      )
      .take(25);
    if (candidates.length === 0) return null;

    let caseRow = candidates[0];
    if (candidates.length > 1) {
      const labels = message.labels;
      const labelList = Array.isArray(labels)
        ? labels.filter((item): item is string => typeof item === "string")
        : [];
      const caseLabel = labelList.find((label) => label.startsWith("case-"));
      if (caseLabel) {
        const caseId = caseLabel.slice("case-".length) as Id<"cases">;
        const matched = candidates.find((row) => row._id === caseId);
        if (matched) caseRow = matched;
      } else {
        caseRow = [...candidates].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      }
    }

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

/** Demo-only: inject a fictional payer reply without waiting on AgentMail. */
export const simulateInboundReply = mutation({
  args: { caseId: v.id("cases") },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }
    const ownerId = identity.tokenIdentifier;
    const caseRow = await ctx.db.get("cases", args.caseId);
    if (!caseRow || caseRow.ownerId !== ownerId) {
      throw new ConvexError("Case not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .take(20);
    const outbound = messages.find((row) => row.direction === "outbound");
    if (!outbound) {
      throw new ConvexError(
        "Approve and send an appeal before simulating a reply",
      );
    }

    const now = Date.now();
    const messageId = `demo-inbound:${args.caseId}:${now}`;
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_agentMailMessageId", (q) =>
        q.eq("agentMailMessageId", messageId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }

    const subject = `Re: ${outbound.subject ?? "your appeal"}`;
    const body = [
      "FICTIONAL DEMO REPLY — NOT A REAL PAYER MESSAGE",
      "",
      `Hello, we received appeal reference DEMO-4821 regarding ${caseRow.title}.`,
      "We are reviewing the submitted clinical information and the cited policy language.",
      "This automated demonstration reply does not approve or deny coverage.",
      "",
      `— ${caseRow.counterpartyName ?? "Demo Appeals Desk"}`,
    ].join("\n");

    const messageRowId = await ctx.db.insert("messages", {
      caseId: caseRow._id,
      ownerId,
      direction: "inbound",
      channel: "email",
      status: "received",
      subject,
      body,
      agentMailMessageId: messageId,
      threadId: outbound.threadId ?? `demo-thread:${args.caseId}`,
      from: caseRow.counterpartyEmail ?? "appeals@example.com",
      to: caseRow.agentMailInboxEmail ?? outbound.from,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("cases", caseRow._id, {
      status: "awaiting_reply",
      updatedAt: now,
    });
    await ctx.db.insert("auditLog", {
      caseId: caseRow._id,
      ownerId,
      actor: "user",
      event: "demo.inbound_simulated",
      operationId: `demo:inbound:${messageRowId}`,
      status: "succeeded",
      entityType: "message",
      entityId: String(messageRowId),
      detail: "Fictional inbound reply injected for the public demo.",
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.replyDraft.proposeFollowUp, {
      caseId: caseRow._id,
      ownerId,
      inboundSubject: subject,
      inboundBody: body,
    });
    return messageRowId;
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
