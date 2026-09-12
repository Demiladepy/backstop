import { env } from "./_generated/server";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export class ExternalApiError extends Error {
  readonly service: "Firecrawl" | "OpenAI";

  constructor(
    service: "Firecrawl" | "OpenAI",
    message: string,
  ) {
    super(`${service}: ${message}`);
    this.service = service;
  }
}

function requiredEnv(name: "FIRECRAWL_API_KEY" | "OPENAI_API_KEY" | "OPENAI_MODEL") {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured in the Convex deployment`);
  }
  return value;
}

export function firecrawlKey() {
  return requiredEnv("FIRECRAWL_API_KEY");
}

export function openAiConfig() {
  return {
    apiKey: requiredEnv("OPENAI_API_KEY"),
    model: requiredEnv("OPENAI_MODEL"),
  };
}

export function buildFirecrawlParseRequest(
  blob: Blob,
  fileName: string,
  mimeType: string,
  apiKey: string,
) {
  const body = new FormData();
  body.append("file", blob, fileName);
  const options: Record<string, unknown> = {
    formats: ["markdown"],
    onlyMainContent: true,
    redactPII: true,
    timeout: 120_000,
  };
  if (mimeType === "application/pdf") {
    options.parsers = [{ type: "pdf", mode: "auto", maxPages: 100 }];
  }
  body.append(
    "options",
    new Blob([JSON.stringify(options)], { type: "application/json" }),
  );
  return {
    url: `${FIRECRAWL_BASE_URL}/parse`,
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    } satisfies RequestInit,
  };
}

async function readResponse(
  service: "Firecrawl" | "OpenAI",
  response: Response,
): Promise<unknown> {
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : typeof payload === "string"
          ? payload.slice(0, 500)
          : `HTTP ${response.status}`;
    throw new ExternalApiError(service, `${response.status}: ${detail}`);
  }
  return payload;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export async function parseWithFirecrawl(
  blob: Blob,
  fileName: string,
  mimeType: string,
) {
  const request = buildFirecrawlParseRequest(
    blob,
    fileName,
    mimeType,
    firecrawlKey(),
  );
  const payload = object(
    await readResponse("Firecrawl", await fetch(request.url, request.init)),
  );
  const data = object(payload?.data);
  const markdown =
    typeof data?.markdown === "string"
      ? data.markdown
      : typeof payload?.markdown === "string"
        ? payload.markdown
        : null;
  if (!markdown?.trim()) {
    throw new ExternalApiError(
      "Firecrawl",
      "parse response did not contain data.markdown",
    );
  }
  return markdown;
}

export type FirecrawlSearchResult = {
  url: string;
  title: string;
  description: string;
  markdown?: string;
};

export type FirecrawlSearchOptions = {
  limit?: number;
  includeDomains?: string[];
  scrapeMarkdown?: boolean;
};

export async function searchWithFirecrawl(
  query: string,
  options: FirecrawlSearchOptions = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 10);
  const body: Record<string, unknown> = {
    query: query.slice(0, 500),
    limit,
    sources: [{ type: "web" }],
    location: "United States",
  };
  if (options.includeDomains?.length) {
    body.includeDomains = options.includeDomains.slice(0, 10);
  }
  if (options.scrapeMarkdown) {
    body.scrapeOptions = {
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 45_000,
    };
  }
  const response = await fetch(`${FIRECRAWL_BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = object(await readResponse("Firecrawl", response));
  const data = payload?.data;
  const web = object(data)?.web;
  const rows = Array.isArray(web) ? web : Array.isArray(data) ? data : null;
  if (!rows) {
    throw new ExternalApiError(
      "Firecrawl",
      "search response did not contain data.web",
    );
  }
  const results: FirecrawlSearchResult[] = [];
  for (const rowValue of rows) {
    const row = object(rowValue);
    if (typeof row?.url !== "string" || !row.url.startsWith("http")) {
      continue;
    }
    results.push({
      url: row.url,
      title: typeof row.title === "string" ? row.title : row.url,
      description:
        typeof row.description === "string" ? row.description : "",
      markdown:
        typeof row.markdown === "string" && row.markdown.trim()
          ? row.markdown
          : undefined,
    });
  }
  if (results.length === 0) {
    throw new ExternalApiError("Firecrawl", "search returned no usable URLs");
  }
  return results;
}

export async function scrapeWithFirecrawl(url: string) {
  const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: true,
      timeout: 60_000,
    }),
  });
  const payload = object(await readResponse("Firecrawl", response));
  const data = object(payload?.data);
  if (typeof data?.markdown !== "string" || !data.markdown.trim()) {
    throw new ExternalApiError(
      "Firecrawl",
      `scrape response for ${url} did not contain data.markdown`,
    );
  }
  const metadata = object(data.metadata);
  return {
    markdown: data.markdown,
    html: typeof data.html === "string" ? data.html : "",
    scrapeId:
      typeof metadata?.scrapeId === "string" ? metadata.scrapeId : undefined,
    title:
      typeof metadata?.title === "string" ? metadata.title : undefined,
    publisher:
      typeof metadata?.sourceURL === "string"
        ? new URL(metadata.sourceURL).hostname
        : new URL(url).hostname,
  };
}

const CREDENTIAL_PATTERN =
  /password|passwd|card number|credit card|cvv|cvc|bank account|routing number|ssn|social security/i;

export function containsCredentialFields(text: string) {
  return CREDENTIAL_PATTERN.test(text);
}

export async function createFirecrawlMonitor(args: {
  name: string;
  url: string;
  webhookUrl: string;
  goal: string;
}) {
  const response = await fetch(`${FIRECRAWL_BASE_URL}/monitor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: args.name,
      schedule: { text: "every 6 hours" },
      targets: [{ type: "scrape", urls: [args.url] }],
      goal: args.goal,
      judgeEnabled: true,
      webhook: { url: args.webhookUrl, events: ["monitor.page"] },
    }),
  });
  const payload = object(await readResponse("Firecrawl", response));
  const data = object(payload?.data) ?? payload;
  const id =
    typeof data?.id === "string"
      ? data.id
      : typeof data?.monitorId === "string"
        ? data.monitorId
        : undefined;
  if (!id) {
    throw new ExternalApiError(
      "Firecrawl",
      "monitor create response omitted monitor id",
    );
  }
  return id;
}

export async function interactWithFirecrawl(args: {
  url: string;
  prompt: string;
}) {
  const scraped = await scrapeWithFirecrawl(args.url);
  if (!scraped.scrapeId) {
    throw new ExternalApiError(
      "Firecrawl",
      "scrape response omitted metadata.scrapeId needed for /interact",
    );
  }
  const combined = `${scraped.markdown}\n${scraped.html}`;
  if (containsCredentialFields(combined)) {
    throw new ExternalApiError(
      "Firecrawl",
      "CREDENTIAL_FIELDS_PRESENT: public-form fill aborted because password, card, or bank fields were detected",
    );
  }
  const response = await fetch(
    `${FIRECRAWL_BASE_URL}/scrape/${scraped.scrapeId}/interact`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: args.prompt,
        timeout: 90,
      }),
    },
  );
  const payload = object(await readResponse("Firecrawl", response));
  const data = object(payload?.data) ?? payload;
  await fetch(`${FIRECRAWL_BASE_URL}/scrape/${scraped.scrapeId}/interact`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${firecrawlKey()}` },
  }).catch(() => undefined);
  const output =
    typeof data?.output === "string"
      ? data.output
      : typeof payload?.output === "string"
        ? payload.output
        : scraped.markdown.slice(0, 8_000);
  if (containsCredentialFields(output)) {
    throw new ExternalApiError(
      "Firecrawl",
      "CREDENTIAL_FIELDS_PRESENT: interact output mentioned credential fields; aborting",
    );
  }
  return {
    scrapeId: scraped.scrapeId,
    title: scraped.title ?? args.url,
    output,
    liveViewUrl:
      typeof data?.liveViewUrl === "string" ? data.liveViewUrl : undefined,
  };
}

export async function createStructuredResponse(
  input: Array<{ role: "system" | "user"; content: string }>,
  schema: Record<string, unknown>,
) {
  const { apiKey, model } = openAiConfig();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "appeal_draft",
          strict: true,
          schema,
        },
      },
    }),
  });
  const payload = object(await readResponse("OpenAI", response));
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }
  const output = payload?.output;
  if (Array.isArray(output)) {
    for (const itemValue of output) {
      const content = object(itemValue)?.content;
      if (!Array.isArray(content)) continue;
      for (const contentValue of content) {
        const part = object(contentValue);
        if (part?.type === "output_text" && typeof part.text === "string") {
          return part.text;
        }
      }
    }
  }
  throw new ExternalApiError(
    "OpenAI",
    "Responses payload did not contain output text",
  );
}

export function safeExternalError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown external error";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]").slice(0, 1_000);
}
