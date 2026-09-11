/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("authentication, ownership, and scope", () => {
  test("queries and mutations require authentication and isolate owners", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.cases.listCases, {})).rejects.toThrow(
      "Authentication required",
    );
    await expect(
      t.mutation(api.cases.createCase, {
        title: "Anonymous denial",
        category: "medical_denial",
      }),
    ).rejects.toThrow("Authentication required");

    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const other = t.withIdentity({ tokenIdentifier: "test|other" });
    const ownerCaseId = await owner.mutation(api.cases.createCase, {
      title: "Owner sample denial",
      category: "medical_denial",
    });
    const otherCaseId = await other.mutation(api.cases.createCase, {
      title: "Other sample denial",
      category: "medical_denial",
    });

    expect(await owner.query(api.cases.listCases, {})).toMatchObject([
      { _id: ownerCaseId, ownerId: "test|owner" },
    ]);
    expect(await owner.query(api.cases.getCase, { caseId: otherCaseId })).toBeNull();
    expect(await other.query(api.cases.getCase, { caseId: ownerCaseId })).toBeNull();

    const draftId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("drafts", {
        caseId: ownerCaseId,
        ownerId: "test|owner",
        kind: "appeal",
        status: "pending_approval",
        subject: "Private owner draft",
        paragraphs: [{
          text: "[UNVERIFIED] Owner-only request.",
          sourceIds: [],
          verification: "unverified",
        }],
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(
      other.mutation(api.cases.editDraft, {
        draftId,
        subject: "Stolen draft",
        paragraphs: [{
          text: "[UNVERIFIED] Tampered.",
          sourceIds: [],
          verification: "unverified",
        }],
      }),
    ).rejects.toThrow("Draft not found");
    await expect(
      other.action(api.draftAppeal.draftAppeal, { caseId: ownerCaseId }),
    ).rejects.toThrow("Case not found");
  });

  test("the schema accepts medical denials only", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    await expect(
      owner.mutation(api.cases.createCase, {
        title: "Out-of-scope tenant dispute",
        // @ts-expect-error Intentionally exercise the runtime validator.
        category: "tenant_dispute",
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.cases.listCases, {})).toEqual([]);
  });
});

describe("draft safety and state transitions", () => {
  test("a draft follows pending -> rejected and appends its audit trail", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "State transition denial",
      category: "medical_denial",
    });
    const sourceId = await t.run(async (ctx) => {
      const sourceId = await ctx.db.insert("sources", {
        caseId,
        ownerId: "test|owner",
        kind: "document",
        title: "Sample denial letter",
        content: "The sample request was denied.",
        excerpt: "The sample request was denied.",
        retrievedAt: Date.now(),
      });
      await ctx.db.patch("cases", caseId, { status: "drafting" });
      return sourceId;
    });
    const operationId = "openai:draft:state-test";
    await t.mutation(internal.workflowModel.beginDraft, {
      caseId,
      ownerId: "test|owner",
      operationId,
    });
    const draftId = await t.mutation(internal.workflowModel.completeDraft, {
      caseId,
      ownerId: "test|owner",
      operationId,
      subject: "Request for reconsideration",
      paragraphs: [{
        text: "The sample request was denied.",
        sourceIds: [sourceId],
        verification: "cited",
      }],
    });
    await owner.mutation(api.cases.editDraft, {
      draftId,
      subject: "Edited request for reconsideration",
      paragraphs: [{
        text: "The sample request was denied; please reconsider.",
        sourceIds: [sourceId],
        verification: "cited",
      }],
    });
    await owner.mutation(api.cases.rejectDraft, {
      draftId,
      reason: "Please make the requested remedy more specific.",
    });

    const detail = await owner.query(api.cases.getCase, { caseId });
    expect(detail?.case.status).toBe("drafting");
    expect(detail?.drafts[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "Please make the requested remedy more specific.",
    });
    expect(detail?.audit.map((entry: Doc<"auditLog">) => entry.event)).toEqual(
      expect.arrayContaining([
        "case.created",
        "external.openai.draft_appeal",
        "draft.edited",
        "draft.rejected",
      ]),
    );
    expect(
      detail?.audit.filter((entry: Doc<"auditLog">) =>
        entry.operationId === operationId),
    ).toHaveLength(2);
  });

  test("drafts can be edited only while pending approval", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "Locked draft denial",
      category: "medical_denial",
    });
    const statuses = ["drafting", "approved", "rejected", "sent"] as const;
    const draftIds = await t.run(async (ctx) => {
      const now = Date.now();
      return await Promise.all(statuses.map((status) =>
        ctx.db.insert("drafts", {
          caseId,
          ownerId: "test|owner",
          kind: "appeal",
          status,
          subject: `${status} subject`,
          paragraphs: [{
            text: "[UNVERIFIED] Sample request.",
            sourceIds: [],
            verification: "unverified",
          }],
          createdAt: now,
          updatedAt: now,
        }),
      ));
    });

    for (const [index, draftId] of draftIds.entries()) {
      await expect(
        owner.mutation(api.cases.editDraft, {
          draftId,
          subject: "Attempted edit",
          paragraphs: [{
            text: "[UNVERIFIED] Attempted edit.",
            sourceIds: [],
            verification: "unverified",
          }],
        }),
      ).rejects.toThrow(`Cannot edit a ${statuses[index]} draft`);
    }
  });

  test("cross-case citations are rejected during generation, edit, and approval", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const firstCaseId = await owner.mutation(api.cases.createCase, {
      title: "First sample denial",
      category: "medical_denial",
      counterpartyName: "Sample Health Plan",
      counterpartyEmail: "appeals@example.com",
    });
    const secondCaseId = await owner.mutation(api.cases.createCase, {
      title: "Second sample denial",
      category: "medical_denial",
    });
    const { localSourceId, foreignSourceId, draftId } = await t.run(async (ctx) => {
      const now = Date.now();
      const localSourceId = await ctx.db.insert("sources", {
        caseId: firstCaseId,
        ownerId: "test|owner",
        kind: "document",
        title: "Local denial",
        content: "Local denial text.",
        excerpt: "Local denial text.",
        retrievedAt: now,
      });
      const foreignSourceId = await ctx.db.insert("sources", {
        caseId: secondCaseId,
        ownerId: "test|owner",
        kind: "policy",
        title: "Foreign policy",
        url: "https://example.com/policy",
        content: "Foreign policy language.",
        excerpt: "Foreign policy language.",
        retrievedAt: now,
      });
      const draftId = await ctx.db.insert("drafts", {
        caseId: firstCaseId,
        ownerId: "test|owner",
        kind: "appeal",
        status: "pending_approval",
        subject: "Request for review",
        paragraphs: [{
          text: "The policy requires review.",
          sourceIds: [foreignSourceId],
          verification: "cited",
        }],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch("cases", firstCaseId, { status: "drafting" });
      return { localSourceId, foreignSourceId, draftId };
    });

    await expect(
      t.mutation(internal.workflowModel.completeDraft, {
        caseId: firstCaseId,
        ownerId: "test|owner",
        operationId: "cross-case-generation",
        subject: "Unsafe generated draft",
        paragraphs: [{
          text: "Foreign claim.",
          sourceIds: [foreignSourceId],
          verification: "cited",
        }],
      }),
    ).rejects.toThrow("cross-case source");
    await expect(
      owner.mutation(api.cases.editDraft, {
        draftId,
        subject: "Unsafe edit",
        paragraphs: [{
          text: "Foreign claim.",
          sourceIds: [foreignSourceId],
          verification: "cited",
        }],
      }),
    ).rejects.toThrow("cross-case citation");
    await expect(
      owner.mutation(api.cases.approveDraft, { draftId }),
    ).rejects.toThrow("cross-case citation");

    await owner.mutation(api.cases.editDraft, {
      draftId,
      subject: "Safe edit",
      paragraphs: [{
        text: "Local claim.",
        sourceIds: [localSourceId],
        verification: "cited",
      }],
    });
  });

  test("unverified claims must remain visibly marked and uncited", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "Unverified claim denial",
      category: "medical_denial",
      counterpartyName: "Sample Health Plan",
      counterpartyEmail: "appeals@example.com",
    });
    const draftId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("drafts", {
        caseId,
        ownerId: "test|owner",
        kind: "appeal",
        status: "pending_approval",
        subject: "Request for review",
        paragraphs: [{
          text: "[UNVERIFIED] Unsupported sample claim.",
          sourceIds: [],
          verification: "unverified",
        }],
        createdAt: now,
        updatedAt: now,
      });
    });
    await expect(
      owner.mutation(api.cases.editDraft, {
        draftId,
        subject: "Hidden warning",
        paragraphs: [{
          text: "Unsupported sample claim.",
          sourceIds: [],
          verification: "unverified",
        }],
      }),
    ).rejects.toThrow("visibly marked");

    await t.run(async (ctx) => {
      await ctx.db.patch("drafts", draftId, {
        paragraphs: [{
          text: "Unsupported sample claim.",
          sourceIds: [],
          verification: "unverified",
        }],
      });
    });
    await expect(
      owner.mutation(api.cases.approveDraft, { draftId }),
    ).rejects.toThrow("visibly marked");
  });

  test("duplicate approval is idempotent and creates one approval audit row", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "Idempotent approval denial",
      category: "medical_denial",
      counterpartyName: "Sample Health Plan",
      counterpartyEmail: "appeals@example.com",
    });
    const draftId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("drafts", {
        caseId,
        ownerId: "test|owner",
        kind: "appeal",
        status: "pending_approval",
        subject: "Request for review",
        paragraphs: [{
          text: "[UNVERIFIED] I request another review.",
          sourceIds: [],
          verification: "unverified",
        }],
        createdAt: now,
        updatedAt: now,
      });
    });

    expect(await owner.mutation(api.cases.approveDraft, { draftId })).toBe(draftId);
    expect(await owner.mutation(api.cases.approveDraft, { draftId })).toBe(draftId);
    const detail = await owner.query(api.cases.getCase, { caseId });
    expect(detail?.case.status).toBe("approved");
    expect(
      detail?.audit.filter(
        (entry: Doc<"auditLog">) => entry.event === "draft.approved",
      ),
    ).toHaveLength(1);
    expect(detail?.messages).toEqual([]);
  });
});

describe("send and webhook gates without external credentials", () => {
  test("send enqueue rejects unapproved drafts and approved drafts without a recipient", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "Send gate denial",
      category: "medical_denial",
    });
    const draftId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("drafts", {
        caseId,
        ownerId: "test|owner",
        kind: "appeal",
        status: "pending_approval",
        subject: "Do not send",
        paragraphs: [{
          text: "[UNVERIFIED] Sample request.",
          sourceIds: [],
          verification: "unverified",
        }],
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      t.mutation(internal.email.enqueueApprovedDraft, {
        draftId,
        ownerId: "test|owner",
        inboxId: "inbox_test",
        inboxEmail: "backstop@example.test",
      }),
    ).rejects.toThrow("Only an approved draft can be sent");
    await t.run(async (ctx) => {
      await ctx.db.patch("drafts", draftId, { status: "approved" });
    });
    await expect(
      t.mutation(internal.email.enqueueApprovedDraft, {
        draftId,
        ownerId: "test|owner",
        inboxId: "inbox_test",
        inboxEmail: "backstop@example.test",
      }),
    ).rejects.toThrow("Counterparty email is required");
    const rows = await t.run(async (ctx) => {
      return await ctx.db.query("messages").take(10);
    });
    expect(rows).toEqual([]);
  });

  test("redelivered inbound messages are stored and audited once", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const caseId = await owner.mutation(api.cases.createCase, {
      title: "Inbound dedup denial",
      category: "medical_denial",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch("cases", caseId, {
        agentMailInboxId: "inbox_test",
        agentMailInboxEmail: "backstop@example.test",
      });
    });
    const webhook = {
      message: {
        inbox_id: "inbox_test",
        message_id: "message_123",
        thread_id: "thread_123",
        subject: "Re: sample appeal",
        text: "We received your sample appeal.",
        from: "payer@example.test",
      },
      thread: { thread_id: "thread_123" },
      eventId: "event_123",
    };

    await t.mutation(internal.email.onMessageReceived, webhook);
    await t.mutation(internal.email.onMessageReceived, webhook);

    const stored = await t.run(async (ctx) => {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
        .take(10);
      const audits = await ctx.db
        .query("auditLog")
        .withIndex("by_caseId", (q) => q.eq("caseId", caseId))
        .take(10);
      return { messages, audits };
    });
    expect(stored.messages).toHaveLength(1);
    expect(stored.messages[0]).toMatchObject({
      agentMailMessageId: "message_123",
      direction: "inbound",
      status: "received",
    });
    expect(
      stored.audits.filter((entry) =>
        entry.event === "external.agentmail.inbound_received"),
    ).toHaveLength(1);
  });
});
