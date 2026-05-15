import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Task Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    // Navigate to Planning > Tasks
    await page.getByRole("button", { name: /^(Planowanie|Planning)$/ }).click();
    await page.getByRole("button", { name: /^(Zadania|Tasks)$/ }).click();
    await expect(page.getByRole("button", { name: /dodaj zadanie|add task/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("creates a new task and it appears in the list", async ({ page }) => {
    const taskTitle = `E2E Test Task ${Date.now()}`;

    await page.getByRole("button", { name: /dodaj zadanie|add task/i }).click();

    // Fill in task title in the modal/form
    const titleInput = page.getByRole("textbox", { name: /tytuł|title/i });
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(taskTitle);

    await page.getByRole("button", { name: /zapisz|save/i }).click();

    // Task should appear in the list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });
  });

  test("edits a task title", async ({ page }) => {
    const originalTitle = `Edit Test ${Date.now()}`;
    const updatedTitle = `Updated ${Date.now()}`;

    // Create a task first
    await page.getByRole("button", { name: /dodaj zadanie|add task/i }).click();
    await page.getByRole("textbox", { name: /tytuł|title/i }).fill(originalTitle);
    await page.getByRole("button", { name: /zapisz|save/i }).click();
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 10000 });

    // Click on it to open edit modal
    await page.getByText(originalTitle).click();

    // Update title
    const titleInput = page.getByRole("textbox", { name: /tytuł|title/i });
    await titleInput.clear();
    await titleInput.fill(updatedTitle);
    await page.getByRole("button", { name: /zapisz|save/i }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 10000 });
    expect(await page.getByText(originalTitle).count()).toBe(0);
  });

  test("deletes a task", async ({ page }) => {
    const taskTitle = `Delete Test ${Date.now()}`;

    // Create a task first
    await page.getByRole("button", { name: /dodaj zadanie|add task/i }).click();
    await page.getByRole("textbox", { name: /tytuł|title/i }).fill(taskTitle);
    await page.getByRole("button", { name: /zapisz|save/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 10000 });

    // Open and delete
    await page.getByText(taskTitle).click();
    await page.getByRole("button", { name: /usuń|delete/i }).click();

    // Confirm deletion if a dialog appears
    const confirmBtn = page.getByRole("button", { name: /tak|potwierdź|confirm|yes/i });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.getByText(taskTitle)).not.toBeVisible({ timeout: 10000 });
  });
});
