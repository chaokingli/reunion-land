import { expect, test } from '@playwright/test';

test('lobby loads and a local game can start', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1.title')).toHaveText('团圆大富翁');
  await page.locator('button.start').last().click();
  await expect(page.locator('app-game-cell.border').first()).toBeVisible({ timeout: 15_000 });
});
