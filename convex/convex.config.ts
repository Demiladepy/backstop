import { defineApp } from "convex/server";
import agentmail from "@agentmail/convex/convex.config";
import firecrawlScrape from "convex-firecrawl-scrape/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import { v } from "convex/values";

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_MODEL: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.optional(v.string()),
    AGENTMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    AGENTMAIL_BASE_URL: v.optional(v.string()),
    AGENTMAIL_SHARED_INBOX_ID: v.optional(v.string()),
    AGENTMAIL_SHARED_INBOX_EMAIL: v.optional(v.string()),
    DEMO_ALLOW_LOCAL_SEND: v.optional(v.string()),
  },
});
app.use(staticHosting);
app.use(agentmail);
app.use(firecrawlScrape);

export default app;
