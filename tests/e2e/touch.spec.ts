import { expect, test } from './fixtures';

test('Touch-Ziele sind mindestens 44 px hoch', async ({ page }) => {
  await page.goto('./');
  const buttons = page.locator('button:visible, a.btn:visible, a.chip:visible');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    if (box) expect(box.height, await buttons.nth(i).innerText()).toBeGreaterThanOrEqual(43.5);
  }
});
