/**
 * Narration-paced live recording for hackathon submission (< 3 min).
 * Run: npx playwright test --config=e2e/live-demo-record.config.ts
 */
import { expect, test } from "@playwright/test";

const LIVE =
  process.env.LIVE_URL ?? "https://backstop-xi.vercel.app";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("record DEMO.md hero path", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await pause(2_000);

  await page.getByRole("button", { name: "Enter private demo" }).first().click();
  await expect(
    page.getByRole("button", { name: "Start a sample case" }),
  ).toBeVisible({ timeout: 45_000 });
  await pause(2_500);

  await page.getByRole("button", { name: "Start a sample case" }).click();
  await expect(
    page.getByRole("heading", { name: "Begin with the envelope." }),
  ).toBeVisible({ timeout: 20_000 });
  await pause(1_500);

  const title = `Demo denial ${Date.now()}`;
  await page.getByLabel(/Case title/).fill(title);
  await page.getByLabel(/Payer name/).fill("Aetna (fictional demo)");
  await page.getByLabel(/Appeal email/).fill("appeals@example.com");
  await pause(1_000);
  await page.getByRole("button", { name: "Open case file" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({
    timeout: 60_000,
  });
  await pause(2_000);

  await page.getByRole("button", { name: /Evidence/ }).click();
  await pause(2_000);
  const seedBtn = page.getByRole("button", {
    name: /Use the fictional demo letter/i,
  });
  if (await seedBtn.isVisible().catch(() => false)) {
    await seedBtn.click();
  }
  await expect(
    page.getByText(/sample-denial\.html|Parsed|policy|source/i).first(),
  ).toBeVisible({ timeout: 90_000 });
  await pause(3_000);

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
        return "wait";
      },
      { timeout: 180_000, intervals: [4_000, 6_000, 8_000] },
    )
    .toMatch(/ready|drafting/);
  await expect(approveBtn).toBeVisible({ timeout: 120_000 });
  await pause(4_000);

  await approveBtn.click();
  const emailTab = page.locator(
    'nav[aria-label="Case file sections"] button',
    { hasText: /^Email\s+[1-9]/ },
  );
  await expect(emailTab).toBeVisible({ timeout: 90_000 });
  await pause(2_000);
  await emailTab.click();
  await pause(2_500);

  const simulate = page.getByRole("button", {
    name: /Simulate fictional payer reply/i,
  });
  await expect(simulate).toBeVisible({ timeout: 60_000 });
  await simulate.click();
  await expect(
    page.getByText(/FICTIONAL DEMO REPLY|inbound|received/i).first(),
  ).toBeVisible({ timeout: 60_000 });
  await pause(3_000);

  await page.getByRole("button", { name: /Watch/ }).click();
  const watchBeat = page.getByRole("button", {
    name: /Run demo Watch beat/i,
  });
  await expect(watchBeat).toBeVisible({ timeout: 20_000 });
  await pause(1_500);
  await watchBeat.click();
  await expect(
    page
      .getByText(/deadline|Active watches|monitor|form|Watch this/i)
      .first(),
  ).toBeVisible({ timeout: 120_000 });
  await pause(4_000);

  await page.getByRole("button", { name: /Record/ }).click();
  await pause(3_000);
  await page.getByRole("button", { name: "← All cases" }).click();
  await pause(3_000);
});
