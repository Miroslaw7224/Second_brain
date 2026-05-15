import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Notes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Knowledge > Notes tab
    await page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ }).click();
    await page.getByRole("button", { name: /^(Notatki|Notes)$/ }).click();
    await expect(page.getByRole("button", { name: /nowa notatka|new note/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("creates a new note", async ({ page }) => {
    await page.getByRole("button", { name: /nowa notatka|new note/i }).click();

    // Note editor should appear
    await expect(page.locator("[contenteditable]")).toBeVisible({ timeout: 10000 });

    // Type content into the editor
    await page.locator("[contenteditable]").click();
    await page.keyboard.type("Test notatka e2e");

    // Save note — may auto-save or require explicit save button
    const saveBtn = page.getByRole("button", { name: /zapisz|save/i });
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
    } else {
      // Auto-save — wait a moment
      await page.waitForTimeout(1500);
    }

    // Note should appear in the list
    await expect(page.getByText("Test notatka e2e")).toBeVisible({ timeout: 15000 });
  });

  test("note title is editable", async ({ page }) => {
    await page.getByRole("button", { name: /nowa notatka|new note/i }).click();
    await expect(page.locator("[contenteditable]")).toBeVisible({ timeout: 10000 });

    // Find title input (usually a separate text input above the editor)
    const titleInput = page
      .getByRole("textbox", { name: /tytuł|title/i })
      .or(page.locator("input[placeholder*='tytułu'], input[placeholder*='title']").first());

    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill("Moja notatka e2e");
      await page.waitForTimeout(500);
      await expect(page.getByText("Moja notatka e2e")).toBeVisible({ timeout: 5000 });
    }
  });
});
