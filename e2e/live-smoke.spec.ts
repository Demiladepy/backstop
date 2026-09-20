/**
 * Live smoke against the canonical Convex static host.
 * Override with LIVE_URL if needed.
 * Run: npx playwright test --config=e2e/live-smoke.config.ts
 */
import { expect, test } from "@playwright/test";

const LIVE =
  process.env.LIVE_URL ?? "https://festive-roadrunner-713.convex.site";

test.describe.configure({ mode: "serial" });

test("auth: Enter private demo reaches the case board", async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  const entrance = page
    .getByRole("button", { name: "Enter private demo" })
    .first();
  await expect(entrance).toBeVisible({ timeout: 30_000 });
  await entrance.click();

  await expect(
    page.getByRole("button", { name: "Start a sample case" }),
  ).toBeVisible({ timeout: 45_000 });

  const authFail = consoleErrors.find((line) =>
    /Auth provider discovery|Failed to authenticate/i.test(line),
  );
  expect(
    authFail,
    `auth console errors: ${consoleErrors.join(" | ")}`,
  ).toBeUndefined();
});

test("hero: sample case through grounding cite and approve", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  await page
    .getByRole("button", { name: "Enter private demo" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Start a sample case" }),
  ).toBeVisible({ timeout: 45_000 });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Start a sample case" }).click();
  await expect(
    page.getByRole("heading", { name: "Begin with the envelope." }),
  ).toBeVisible({ timeout: 20_000 });

  const title = `Live smoke denial ${Date.now()}`;
  await page.getByLabel(/Case title/).fill(title);
  await page.getByLabel(/Payer name/).fill("Aetna (fictional demo)");
  await page.getByLabel(/Appeal email/).fill("appeals@example.com");
  await page.getByRole("button", { name: "Open case file" }).click();

  await expect(
    page.getByRole("heading", { name: title, level: 1 }),
  ).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: /Evidence/ }).click();

  const seedBtn = page.getByRole("button", {
    name: /Use the fictional demo (letter|packet)/i,
  });
  if (await seedBtn.isVisible().catch(() => false)) {
    await seedBtn.click();
  }

  await expect(
    page
      .getByText(/sample-denial\.html|Parsed|Reading|Finding|policy|source/i)
      .first(),
  ).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: /Appeal/ }).click();
  const approveBtn = page.getByRole("button", {
    name: /Approve and send appeal/i,
  });
  // Parse -> research -> draft chains on its own. Clicking "Draft grounded
  // appeal" while research is in flight used to flip the case out of
  // "researching" and strand the policy sources, so the hero path must wait
  // for the chain rather than race it.
  await expect
    .poll(
      async () => {
        if (await approveBtn.isVisible().catch(() => false)) return "ready";
        await page
          .getByRole("button", { name: /Appeal/ })
          .click()
          .catch(() => {});
        return "wait";
      },
      { timeout: 180_000, intervals: [4_000, 6_000, 8_000] },
    )
    .toBe("ready");

  await expect(approveBtn).toBeVisible({ timeout: 120_000 });
  await expect(approveBtn).toBeEnabled();

  // The grounding beat: a citation must open a real policy clause with a
  // working link. Document citations have no URL, so walk the chips until the
  // proof pane shows an insurer policy clause. "Open original" is an anchor.
  const proof = page.locator(".policy-proof");
  const chips = page.locator(".cite-chip, button.cite");
  await expect(chips.first()).toBeVisible({ timeout: 30_000 });
  // The denial's reason line must be highlighted beside the draft. This used
  // to fail silently: the sentence was found in a whitespace-collapsed copy
  // and then looked up in the original, which wraps across lines.
  const denialHit = page.locator(".denial-hit");
  await expect(denialHit.first()).toBeVisible({ timeout: 20_000 });
  expect((await denialHit.first().innerText()).length).toBeGreaterThan(30);

  const kindLabel = proof.locator(".policy-proof-kind");
  const chipCount = await chips.count();
  let policyShown = false;
  for (let i = 0; i < chipCount; i += 1) {
    await chips.nth(i).click();
    // The proof pane re-renders on click; read it only once it has settled,
    // otherwise a document chip can be misread as "no policy clause".
    const kind = await expect
      .poll(async () => await kindLabel.innerText().catch(() => ""), {
        timeout: 10_000,
        intervals: [250, 500, 1_000],
      })
      .not.toBe("")
      .then(async () => await kindLabel.innerText())
      .catch(() => "");
    if (/policy clause/i.test(kind)) {
      policyShown = true;
      break;
    }
  }
  expect(policyShown, "no cited insurer policy clause in the draft").toBe(true);

  await expect(proof.locator("blockquote")).not.toBeEmpty();
  const openOriginal = proof.getByRole("link", { name: /Open original/i });
  await expect(openOriginal).toBeVisible({ timeout: 20_000 });
  expect(await openOriginal.getAttribute("href")).toMatch(/^https:\/\//);
  // A cited policy page must not be an error page; that shipped once.
  const proofText = (await proof.innerText()).toLowerCase();
  expect(proofText).not.toMatch(
    /page not found|matches your entry|access denied/,
  );

  await approveBtn.click();

  const emailTab = page.locator(
    'nav[aria-label="Case file sections"] button',
    { hasText: /^Email\s+[1-9]/ },
  );
  await expect(emailTab).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/Needs attention/i)).toHaveCount(0);
  await emailTab.click();
  await expect(page.getByText(/The correspondence file is quiet/i)).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Simulate fictional payer reply/i }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /Record/ }).click();
  await expect(
    page.getByText(/Firecrawl|OpenAI|AgentMail|How this case ran/i).first(),
  ).toBeVisible({ timeout: 30_000 });

  const fatal = consoleErrors.filter((line) =>
    /Auth provider discovery|Failed to authenticate|VITE_CONVEX_URL/i.test(
      line,
    ),
  );
  expect(fatal, fatal.join(" | ")).toEqual([]);
});

test("mobile: landing and board do not overflow at 390px", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });

  const entrance = page
    .getByRole("button", { name: "Enter private demo" })
    .first();
  await expect(entrance).toBeVisible({ timeout: 30_000 });
  const landingOverflow = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(landingOverflow.scrollWidth).toBeLessThanOrEqual(
    landingOverflow.clientWidth + 1,
  );

  await entrance.click();
  await expect(
    page.getByRole("button", { name: "Start a sample case" }),
  ).toBeVisible({ timeout: 45_000 });

  const boardOverflow = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(boardOverflow.scrollWidth).toBeLessThanOrEqual(
    boardOverflow.clientWidth + 1,
  );
});
