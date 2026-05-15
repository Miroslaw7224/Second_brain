import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Knowledge Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Knowledge > Chat tab
    const knowledgeBtn = page.getByRole("button", { name: /^(Wiedza|Knowledge)$/ });
    await knowledgeBtn.click();
    // Chat panel should already be the default tab — verify textarea is visible
    await expect(page.getByRole("textbox")).toBeVisible({ timeout: 15000 });
  });

  test("sends a message and receives a non-empty AI response", async ({ page }) => {
    await page.getByRole("textbox").fill("Co to jest Second Brain?");
    await page.keyboard.press("Enter");

    // Wait for loading state to disappear and AI message to appear
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
    await page.getByRole("textbox").fill("zapamiętaj https://nextjs.org");
    await page.keyboard.press("Enter");

    // Pending node preview should appear
    await expect(page.getByText(/Next\.?[Jj][Ss]|nextjs/i)).toBeVisible({ timeout: 30000 });
    // Save button should appear
    const saveBtn = page.getByRole("button", { name: /zapisz/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
  });

  test("clears chat when trash button is clicked", async ({ page }) => {
    // Send a message first
    await page.getByRole("textbox").fill("Cześć");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Cześć")).toBeVisible({ timeout: 10000 });

    // Click clear button
    await page.getByTitle(/wyczyść|clear/i).click();

    // Chat should be empty
    await expect(page.getByText("Cześć")).not.toBeVisible();
  });
});
