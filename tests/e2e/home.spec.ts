import { test, expect } from '@playwright/test';

test.describe('Strona główna', () => {
  test('ładuje się i pokazuje ekran logowania', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Second Brain/i })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveTitle(/Second Brain|Vite/);
  });

  test('wyświetla tytuł aplikacji i formularz logowania', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Second Brain/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Freelancer Edition/i)).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Zaloguj się|Login/i })).toBeVisible();
  });

  test('ma przycisk logowania przez Google', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Zaloguj przez Google|Sign in with Google/i })).toBeVisible({ timeout: 15000 });
  });

  test('ma opcję kontynuuj jako gość', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Kontynuuj jako Gość|Continue as Guest/i })).toBeVisible({ timeout: 15000 });
  });

  test('przełączenie na rejestrację pokazuje formularz rejestracji', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Second Brain/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Zarejestruj się|Register/i }).first().click();
    await expect(page.getByRole('heading', { name: /Zarejestruj się|Register/i })).toBeVisible();
    await expect(page.locator('form input[type="text"]').first()).toBeVisible();
  });
});
