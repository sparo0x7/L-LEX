import { expect, test } from '@playwright/test';

test.describe('L-LEX smoke', () => {
  test('switches locale and text direction without page errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.locator('[data-locale="en"]').click();
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.locator('[data-locale="ar"]').click();
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.locator('[data-locale="ckb"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(pageErrors).toEqual([]);
  });

  test('finds an article by number and opens the correct law/article route', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/en/search');
    await page.locator('[data-search-input]').fill('251');
    const firstResult = page.locator('[data-result-id]').first();
    await expect(firstResult).toBeVisible({ timeout: 15_000 });

    const href = await firstResult.locator('h3 a').getAttribute('href');
    expect(href).toContain('/en/law/iraqi-penal-code-1969/article/251');
    await firstResult.locator('h3 a').click();

    await expect(page).toHaveURL(/\/en\/law\/iraqi-penal-code-1969\/article\/251/);
    await expect(page.locator('article h1')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('shows translation status honestly and persists favorites/theme', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/en/law/iraqi-penal-code-1969/article/1');
    await expect(page.locator('article h1')).toContainText('Principle of Legality');
    await expect(page.getByText('Machine-translated — not yet legally reviewed')).toBeVisible();

    const favorite = page.locator('[data-favorite]');
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');

    await page.locator('[data-theme-preference="dark"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-theme-preference="dark"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.goto('/en/favorites');
    await expect(page.locator('[data-unfavorite]')).toHaveCount(1);
    expect(pageErrors).toEqual([]);
  });

  test('keeps mobile layout inside the viewport and renders a 404 route', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/search');
    await expect(page.locator('[data-search-input]')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto('/definitely-not-a-route');
    await expect(page.locator('h1')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
