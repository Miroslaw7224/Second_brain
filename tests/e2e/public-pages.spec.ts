import { test, expect } from "@playwright/test";

test.describe("Strony publiczne", () => {
  test("regulamin — tytuł i nawrót", async ({ page }) => {
    await page.goto("/regulamin");
    await expect(page.getByRole("heading", { name: "Regulamin", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Strona główna/i })).toBeVisible();
  });

  test("polityka cookies — tytuł", async ({ page }) => {
    await page.goto("/cookies");
    await expect(page.getByRole("heading", { name: /Polityka plików cookies/i })).toBeVisible();
  });

  test("polityka prywatności — tytuł", async ({ page }) => {
    await page.goto("/politika-prywatnosci");
    await expect(page.getByRole("heading", { name: /Polityka prywatności/i })).toBeVisible();
  });

  test("landing — kotwice i link logowania", async ({ page }) => {
    await page.goto("/#faq");
    await expect(page.getByRole("heading", { name: "FAQ" })).toBeVisible({ timeout: 15000 });
    await page.goto("/#hero");
    await expect(page.getByRole("heading", { name: /Przestań szukać/i })).toBeVisible({
      timeout: 15000,
    });
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Zaloguj się$/ })).toBeVisible();
    await page.getByRole("link", { name: /^Zaloguj się$/ }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
