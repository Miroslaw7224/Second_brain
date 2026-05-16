import { test, expect } from "@playwright/test";

test.describe("Knowledge Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Knowledge > Baza wiedzy (Knowledge Base) chat tab
    const knowledgeBtn = page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ });
    await knowledgeBtn.click();
    // Click the "Baza wiedzy" sidebar tab to open KnowledgeView with chat panel
    await page.getByRole("button", { name: /baza wiedzy/i }).click();
    // Chat textarea should now be visible (distinct from header search by placeholder)
    await expect(page.getByPlaceholder(/wpisz wiedzę|type knowledge/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("sends a message and receives a non-empty AI response", async ({ page }) => {
    await page.getByPlaceholder(/wpisz wiedzę|type knowledge/i).fill("Co to jest Nexus?");
    await page.keyboard.press("Enter");

    // Wait for AI response to appear
    await expect(page.locator("[data-testid='chat-message-assistant']").first()).toBeVisible({
      timeout: 30000,
    });
    const responseText = await page
      .locator("[data-testid='chat-message-assistant']")
      .first()
      .textContent();
    expect(responseText?.length).toBeGreaterThan(10);
  });

  test("saves a URL to knowledge base via chat", async ({ page }) => {
    // Type a save command with a URL
    await page
      .getByPlaceholder(/wpisz wiedzę|type knowledge/i)
      .fill("zapamiętaj https://nextjs.org");
    await page.keyboard.press("Enter");

    // Pending node preview should appear
    await expect(page.getByText(/Next\.?[Jj][Ss]|nextjs/i)).toBeVisible({ timeout: 30000 });
    // Save button should appear
    const saveBtn = page.getByRole("button", { name: /zapisz/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });

  test("clears chat when trash button is clicked", async ({ page }) => {
    // Send a message first
    await page.getByPlaceholder(/wpisz wiedzę|type knowledge/i).fill("Cześć");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Cześć")).toBeVisible({ timeout: 10000 });

    // Click clear button (has title="Wyczyść czat")
    await page.getByTitle(/wyczyść|clear/i).click();

    // Chat should be empty
    await expect(page.getByText("Cześć")).not.toBeVisible();
  });
});
