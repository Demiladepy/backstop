import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, httpAction, internalAction } from "./_generated/server";
import { env } from "./_generated/server";
import {
  containsCredentialFields,
  createFirecrawlMonitor,
  interactWithFirecrawl,
  safeExternalError,
  scrapeWithFirecrawl,
} from "./externalApi";

const RECORDED_FORM_FILL = `[UNVERIFIED] Recorded fallback: a public, no-login complaint form was filled with fictional sample values (name Backstop Demo, issue medical denial appeal, contact appeals@example.com). Submit was not clicked. Use this only when live Firecrawl /interact is unavailable.`;

const DEFAULT_PUBLIC_FORM =
  "https://www.medicare.gov/claims-appeals/how-do-i-file-an-appeal";

async function requireOwner(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Authentication required");
  }
  return identity.tokenIdentifier;
}

export const watchPolicy = action({
  args: {
    caseId: v.id("cases"),
    targetUrl: v.string(),
  },
  returns: v.id("monitors"),
  handler: async (ctx, args): Promise<Id<"monitors">> => {
    const ownerId = await requireOwner(ctx);
    if (!args.targetUrl.startsWith("https://")) {
      throw new ConvexError("Watch URL must be a public https address");
    }
    const operationId = `firecrawl:monitor:${args.caseId}:${crypto.randomUUID()}`;
    try {
      const webhookUrl = `${env.CONVEX_SITE_URL.replace(/\/$/, "")}/firecrawl/monitor`;
      const firecrawlMonitorId = await createFirecrawlMonitor({
        name: `Backstop case ${args.caseId}`,
        url: args.targetUrl,
        webhookUrl,
        goal: "Alert if appeals-window, deadline, or coverage language changes",
      });
      return await ctx.runMutation(internal.workflowModel.upsertMonitor, {
        caseId: args.caseId,
        ownerId,
        kind: "policy_watch",
        targetUrl: args.targetUrl,
        firecrawlMonitorId,
        operationId,
        detail: `Firecrawl /monitor watching ${args.targetUrl}`,
      });
    } catch (error) {
      const message = safeExternalError(error);
      await ctx.runMutation(internal.workflowModel.failExternalDepth, {
        caseId: args.caseId,
        ownerId,
        operationId,
        event: "external.firecrawl.monitor",
        error: message,
      });
      throw new ConvexError(message);
    }
  },
});

export const watchDeadline = action({
  args: { caseId: v.id("cases") },
  returns: v.id("monitors"),
  handler: async (ctx, args): Promise<Id<"monitors">> => {
    const ownerId = await requireOwner(ctx);
    const context = await ctx.runQuery(internal.workflowModel.getCaseContext, {
      caseId: args.caseId,
      ownerId,
    });
    if (!context) throw new ConvexError("Case not found");
    if (!context.case.deadlineAt) {
      throw new ConvexError("Set a deadline before starting a deadline watch");
    }
    const operationId = `firecrawl:deadline:${args.caseId}:${crypto.randomUUID()}`;
    return await ctx.runMutation(internal.workflowModel.upsertMonitor, {
      caseId: args.caseId,
      ownerId,
      kind: "deadline",
      operationId,
      detail: `Deadline watch armed for ${new Date(context.case.deadlineAt).toISOString()}`,
    });
  },
});

export const checkMonitors = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const monitors = await ctx.runQuery(
      internal.workflowModel.listActiveMonitors,
      {},
    );
    const now = Date.now();
    for (const monitor of monitors) {
      const operationId = `firecrawl:monitor-check:${monitor._id}:${now}`;
      try {
        if (monitor.kind === "deadline") {
          const context = await ctx.runQuery(
            internal.workflowModel.getCaseContext,
            { caseId: monitor.caseId, ownerId: monitor.ownerId },
          );
          const deadlineAt = context?.case.deadlineAt;
          const remaining = deadlineAt ? deadlineAt - now : null;
          const summary =
            remaining === null
              ? "Deadline watch has no date yet."
              : remaining <= 0
                ? "Appeals window may already be closed. Review this case now."
                : remaining < 7 * 24 * 60 * 60 * 1000
                  ? `Appeals window is inside 7 days (${Math.ceil(remaining / 86_400_000)} days remaining).`
                  : `Deadline still ${Math.ceil(remaining / 86_400_000)} days away.`;
          await ctx.runMutation(internal.workflowModel.recordMonitorCheck, {
            monitorId: monitor._id,
            ownerId: monitor.ownerId,
            operationId,
            changed: remaining !== null && remaining <= 7 * 24 * 60 * 60 * 1000,
            summary,
          });
          continue;
        }
        if (!monitor.targetUrl) continue;
        const scraped = await scrapeWithFirecrawl(monitor.targetUrl);
        const snapshot = scraped.markdown.slice(0, 8_000);
        const changed =
          Boolean(monitor.lastSnapshot) && monitor.lastSnapshot !== snapshot;
        await ctx.runMutation(internal.workflowModel.recordMonitorCheck, {
          monitorId: monitor._id,
          ownerId: monitor.ownerId,
          operationId,
          changed,
          summary: changed
            ? `Policy page changed at ${monitor.targetUrl}`
            : `No change detected at ${monitor.targetUrl}`,
          snapshot,
        });
      } catch (error) {
        await ctx.runMutation(internal.workflowModel.failExternalDepth, {
          caseId: monitor.caseId,
          ownerId: monitor.ownerId,
          operationId,
          event: "external.firecrawl.monitor",
          error: safeExternalError(error),
        });
      }
    }
    return null;
  },
});

export const fillPublicForm = action({
  args: {
    caseId: v.id("cases"),
    formUrl: v.optional(v.string()),
  },
  returns: v.id("drafts"),
  handler: async (ctx, args): Promise<Id<"drafts">> => {
    const ownerId = await requireOwner(ctx);
    const formUrl = args.formUrl?.trim() || DEFAULT_PUBLIC_FORM;
    if (!formUrl.startsWith("https://")) {
      throw new ConvexError("Form URL must be a public https address");
    }
    if (containsCredentialFields(formUrl)) {
      throw new ConvexError(
        "This URL looks like a login or payment form. Backstop will not fill it.",
      );
    }
    const operationId = `firecrawl:interact:${args.caseId}:${crypto.randomUUID()}`;
    const prompt = [
      "This is a fictional medical-denial advocacy demo.",
      "Fill any public, no-login appeal or complaint fields with sample values only.",
      "Do not click Submit, Send, Pay, Sign in, or any committing control.",
      "Do not type into password, card, bank, SSN, or credential fields.",
      "If those fields exist, stop immediately and say CREDENTIAL_FIELDS_PRESENT.",
      `Case title: sample denial. Contact: appeals@example.com.`,
    ].join(" ");
    try {
      const result = await interactWithFirecrawl({ url: formUrl, prompt });
      return await ctx.runMutation(internal.workflowModel.completeFormFill, {
        caseId: args.caseId,
        ownerId,
        operationId,
        subject: `Prepared public form — ${result.title}`,
        body: `${result.output}\n\nLive view: ${result.liveViewUrl ?? "not provided"}. Submit was not clicked.`,
        sourceUrl: formUrl,
        fallback: false,
      });
    } catch (error) {
      const message = safeExternalError(error);
      if (message.includes("CREDENTIAL_FIELDS_PRESENT")) {
        await ctx.runMutation(internal.workflowModel.failExternalDepth, {
          caseId: args.caseId,
          ownerId,
          operationId,
          event: "external.firecrawl.interact",
          error: message,
        });
        throw new ConvexError(message);
      }
      await ctx.runMutation(internal.workflowModel.failExternalDepth, {
        caseId: args.caseId,
        ownerId,
        operationId,
        event: "external.firecrawl.interact",
        error: message,
      });
      return await ctx.runMutation(internal.workflowModel.completeFormFill, {
        caseId: args.caseId,
        ownerId,
        operationId: `${operationId}:fallback`,
        subject: "Prepared public form — recorded fallback",
        body: `${RECORDED_FORM_FILL}\nLive error: ${message}`,
        sourceUrl: formUrl,
        fallback: true,
      });
    }
  },
});

export const firecrawlMonitorWebhook = httpAction(async (ctx, request) => {
  const payload: unknown = await request.json().catch(() => null);
  if (typeof payload !== "object" || payload === null) {
    return new Response("invalid", { status: 400 });
  }
  const record = payload as Record<string, unknown>;
  const data =
    typeof record.data === "object" && record.data !== null
      ? (record.data as Record<string, unknown>)
      : record;
  const monitorId =
    typeof data.monitorId === "string" ? data.monitorId : undefined;
  if (!monitorId) {
    return new Response("ignored", { status: 202 });
  }
  const monitors = await ctx.runQuery(
    internal.workflowModel.listActiveMonitors,
    {},
  );
  const match = monitors.find((row) => row.firecrawlMonitorId === monitorId);
  if (!match) {
    return new Response("unknown", { status: 202 });
  }
  const status = typeof data.status === "string" ? data.status : "checked";
  const diff =
    typeof data.diff === "object" &&
    data.diff !== null &&
    "text" in data.diff &&
    typeof data.diff.text === "string"
      ? data.diff.text
      : status;
  await ctx.runMutation(internal.workflowModel.recordMonitorCheck, {
    monitorId: match._id,
    ownerId: match.ownerId,
    operationId: `firecrawl:monitor-webhook:${monitorId}:${Date.now()}`,
    changed: status === "changed",
    summary: diff.slice(0, 1_000),
  });
  return new Response("ok", { status: 200 });
});
