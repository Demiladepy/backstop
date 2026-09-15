/**
 * Live smoke against the canonical Vercel frontend.
 * Override with LIVE_URL for the Convex static mirror if needed.
 * Run: npx playwright test --config=e2e/live-vercel.config.ts
 */
import { expect, test } from "@playwright/test";

const LIVE =
  process.env.LIVE_URL ?? "https://backstop-xi.vercel.app";

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

test("hero: sample case through approve, simulate reply, Watch beat", async ({
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

  // Recover if intake seed did not attach (retry demo letter)
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

  // Wait for auto draft; if stuck, trigger manual draft
  await page.getByRole("button", { name: /Appeal/ }).click();
  const approveBtn = page.getByRole("button", {
    name: /Approve and send appeal/i,
  });
  const draftBtn = page.getByRole("button", {
    name: /Draft grounded appeal/i,
  });

  await expect
    .poll(
      async () => {
        if (await approveBtn.isVisible().catch(() => false)) return "ready";
        if (await draftBtn.isVisible().catch(() => false)) {
          const disabled = await draftBtn.isDisabled().catch(() => true);
          if (!disabled) {
            await draftBtn.click();
            return "drafting";
          }
        }
        await page.getByRole("button", { name: /Appeal/ }).click();
        return "wait";
      },
      { timeout: 180_000, intervals: [4_000, 6_000, 8_000] },
    )
    .toMatch(/ready|drafting/);

  await expect(approveBtn).toBeVisible({ timeout: 120_000 });
  await expect(approveBtn).toBeEnabled();
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
  const simulate = page.getByRole("button", {
    name: /Simulate fictional payer reply/i,
  });
  await expect(simulate).toBeVisible({ timeout: 60_000 });
  await simulate.click();
  await expect(
    page.getByText(/FICTIONAL DEMO REPLY|inbound|received/i).first(),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: /Watch/ }).click();
  const watchBeat = page.getByRole("button", {
    name: /Run demo Watch beat/i,
  });
  await expect(watchBeat).toBeVisible({ timeout: 20_000 });
  await watchBeat.click();
  await expect(
    page
      .getByText(/deadline|Active watches|monitor|form|Watch this/i)
      .first(),
  ).toBeVisible({ timeout: 120_000 });

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
