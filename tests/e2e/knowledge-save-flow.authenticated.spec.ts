import { test, expect } from "@playwright/test";

test.describe("Knowledge Save Flow", () => {
  test("saves a resource from chat and it appears in list view", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Knowledge > Baza wiedzy (Knowledge Base) chat panel
    await page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ }).click();
    await page.getByRole("button", { name: /baza wiedzy/i }).click();
    await expect(page.getByPlaceholder(/wpisz wiedzę|type knowledge/i)).toBeVisible({
      timeout: 15000,
    });

    // Send save command
    const uniqueTitle = `TestResource${Date.now()}`;
    await page
      .getByPlaceholder(/wpisz wiedzę|type knowledge/i)
      .fill(`zapamiętaj narzędzie o nazwie ${uniqueTitle}`);
    await page.keyboard.press("Enter");

    // Wait for pending node preview with save button
    await expect(page.getByRole("button", { name: /zapisz/i })).toBeVisible({ timeout: 30000 });

    // Save it
    await page.getByRole("button", { name: /zapisz/i }).click();

    // Confirmation message must appear in an assistant chat bubble (not a pending-node textarea)
    await expect(
      page.locator("[data-testid='chat-message-assistant']").filter({ hasText: /zapisano|saved/i })
    ).toBeVisible({ timeout: 15000 });

    // Switch to Lista tab and verify node title appears exactly in the list
    await page.getByRole("button", { name: /lista/i }).click();
    await expect(page.getByText(uniqueTitle, { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
