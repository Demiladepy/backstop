import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { firecrawlMonitorWebhook } from "./depth";
import { agentmail } from "./email";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);
http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    return await agentmail.handleWebhook(
      ctx as unknown as Parameters<typeof agentmail.handleWebhook>[0],
      request,
    );
  }),
});
http.route({
  path: "/firecrawl/monitor",
  method: "POST",
  handler: firecrawlMonitorWebhook,
});
registerStaticRoutes(http, components.staticHosting);

export default http;
