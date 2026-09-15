import { expect, test } from "@playwright/test";

test("anonymous entrance is responsive, keyboard focused, and error free", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const entrance = page.getByRole("button", { name: "Enter private demo" }).first();
  await expect(
    page.getByRole("heading", {
      name: "From a medical denial to an appeal you control.",
    }),
  ).toBeVisible();
  await entrance.focus();
  await expect(entrance).toBeFocused();
  await expect(entrance).toHaveCSS("outline-style", "solid");
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
  expect(consoleErrors).toEqual([]);
});

test("anonymous user can create a sample case in the existing dev deployment", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/");
  const entrance = page.getByRole("button", { name: "Enter private demo" }).first();
  await entrance.click();
  await expect(
    page.getByRole("button", { name: "Start a sample case" }),
  ).toBeVisible({ timeout: 20_000 });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Start a sample case" }).click();
  await expect(
    page.getByRole("heading", { name: "Begin with the envelope." }),
  ).toBeVisible();

  const title = `Playwright sample denial ${Date.now()}`;
  await page.getByLabel(/Case title/).fill(title);
  await page.getByLabel(/Payer name/).fill("Northstar Sample Health Plan");
  await page.getByLabel(/Appeal email/).fill("appeals@example.com");
  await page.getByRole("button", { name: "Open case file" }).click();

  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("navigation", { name: "Case file sections" })).toBeVisible();

  await page.getByRole("button", { name: /Evidence/ }).click();
  await expect(page.getByText(/sample-denial\.html|Parsed|Reading|Finding/i).first()).toBeVisible({
    timeout: 45_000,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /Evidence/ })).toBeVisible();
  const dimensions = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(consoleErrors).toEqual([]);
});
