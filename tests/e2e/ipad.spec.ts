import { expect, test } from './fixtures';

test('iPad in Safari: Hinweis „Zum Home-Bildschirm“ erscheint', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('install-banner')).toBeVisible();
  await page.getByTestId('install-banner').getByRole('button', { name: 'Später' }).click();
  await expect(page.getByTestId('install-banner')).toHaveCount(0);
});
