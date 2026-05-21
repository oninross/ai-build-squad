import { expect, test } from "@playwright/test";

test("renders scaffold page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "AI Build Squad Scaffold" })).toBeVisible();

  await expect(page).toHaveTitle("AI Build Squad");

  await expect(
    page.getByText("React + TypeScript + SCSS + Vitest + Playwright + Storybook are configured.")
  ).toBeVisible();
});
