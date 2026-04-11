import { test, expect } from "@playwright/test";

test.describe("Dashboard (zalogowany)", () => {
  test("pokazuje shell i przełącza Wiedza / Planowanie", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: "Second Brain" })).toBeVisible({
      timeout: 20000,
    });
    const modeKnowledge = page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ });
    const modePlanning = page.getByRole("button", { name: /^(Planowanie|Planning)$/ });
    await expect(modeKnowledge).toBeVisible({ timeout: 15000 });
    await expect(modePlanning).toBeVisible();

    await modePlanning.click();
    await expect(page.getByRole("button", { name: /^(Kalendarz|Calendar)$/ })).toBeVisible({
      timeout: 15000,
    });

    await modeKnowledge.click();
    await expect(page.getByRole("button", { name: /^(Notatki|Notes)$/ })).toBeVisible({
      timeout: 15000,
    });
  });
});
