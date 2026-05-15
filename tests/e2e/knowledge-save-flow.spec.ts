import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Knowledge Save Flow", () => {
  test("saves a resource from chat and it appears in list view", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Go to Knowledge > Chat
    await page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ }).click();
    await expect(page.getByRole("textbox")).toBeVisible({ timeout: 15000 });

    // Send save command
    const uniqueTitle = `TestResource${Date.now()}`;
    await page.getByRole("textbox").fill(`zapamiętaj narzędzie o nazwie ${uniqueTitle}`);
    await page.keyboard.press("Enter");

    // Wait for pending node preview
    await expect(page.getByRole("button", { name: /zapisz/i })).toBeVisible({ timeout: 30000 });

    // Save it
    await page.getByRole("button", { name: /zapisz/i }).click();

    // Confirmation message should appear
    await expect(page.getByText(/zapisano|saved/i)).toBeVisible({ timeout: 15000 });

    // Switch to Lista tab and verify node is there
    await page.getByRole("button", { name: /lista/i }).click();
    await expect(page.getByText(new RegExp(uniqueTitle, "i"))).toBeVisible({ timeout: 10000 });
  });
});
