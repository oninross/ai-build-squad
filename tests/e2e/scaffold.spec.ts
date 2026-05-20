import { expect, test } from "@playwright/test";

test("renders scaffold page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "AI Build Squad Scaffold" }),
  ).toBeVisible();
});
