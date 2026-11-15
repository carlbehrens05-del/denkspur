import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { startStaticServer } from './staticServer';

async function openApp(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Willkommen bei Denkspur' })).toBeVisible();
}

async function loadDemo(page: Page) {
  await openApp(page);
  await page.getByRole('button', { name: 'Demo-Archiv laden' }).click();
  await expect(page.getByRole('status')).toContainText('Demo-Archiv geladen');
  await expect(page.getByTestId('stat-entries')).not.toHaveText('0');
}

async function search(page: Page, q: string) {
  const input = page.getByRole('searchbox', { name: /Befehlsfeld/ });
  await input.fill(q);
  await input.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/suche\\?q=${encodeURIComponent(q).replace(/\./g, '\\.')}`));
  await expect(page.getByTestId('result-count')).toBeVisible();
}

test('Diagnose: opfs-sahpool, FTS5 und Schema', async ({ page }) => {
  await page.goto('./diagnose');
  await expect(page.getByTestId('diag-vfs')).toHaveAttribute('data-lamp', 'ok');
  await expect(page.getByTestId('diag-vfs')).toContainText('opfs-sahpool');
  await expect(page.getByTestId('diag-fts5')).toHaveAttribute('data-lamp', 'ok');
  await expect(page.getByTestId('diag-schema')).toContainText('Version 1');
  await expect(page.getByTestId('storage-warning')).toHaveCount(0);
});

test('Demo laden, „Facharbeit“ suchen, neu laden – Daten bleiben', async ({ page }) => {
  await loadDemo(page);
  const entries = await page.getByTestId('stat-entries').textContent();
  expect(Number(entries)).toBeGreaterThan(250);

  await search(page, 'Facharbeit');
  const hits = page.getByTestId('hit');
  await expect(hits.first()).toBeVisible();
  await expect(page.getByTestId('result-count')).not.toHaveText('0 Treffer');
  const countBefore = await page.getByTestId('result-count').textContent();

  await page.reload();
  await expect(page.getByTestId('result-count')).toHaveText(countBefore ?? '');
  await expect(hits.first()).toBeVisible();

  await page.goto('./');
  await expect(page.getByTestId('stat-entries')).toHaveText(entries ?? '');
});

test('„uber“ findet „über“', async ({ page }) => {
  await loadDemo(page);
  await search(page, 'uber');
  await expect(page.locator('mark', { hasText: /^über$/i }).first()).toBeVisible();
});

test('Korrektur „4.000 → 400“ und Rückgängig', async ({ page }) => {
  await loadDemo(page);
  await search(page, '4.000');
  await page.getByTestId('hit').filter({ hasText: '4.000 Wildbienen' }).first().click();
  const detail = page.getByTestId('entry-detail');
  await expect(detail.getByTestId('entry-text')).toContainText('4.000 Wildbienen');

  await detail.getByRole('button', { name: 'Korrigieren' }).click();
  const textarea = detail.locator('textarea[name="text"]');
  const original = await textarea.inputValue();
  await textarea.fill(original.replace('4.000', '400'));
  await detail.getByLabel('Grund (optional)').fill('gemeint war 400');
  await detail.getByRole('button', { name: 'Speichern' }).click();

  await expect(page.getByRole('status')).toContainText('Korrektur gespeichert');
  await expect(detail.getByTestId('entry-text')).toContainText('etwa 400 Wildbienen');
  await expect(detail.getByTestId('entry-original')).toContainText('4.000 Wildbienen');
  await expect(detail.getByTestId('versions')).toContainText('Version 2');

  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByRole('status')).toContainText('Korrektur rückgängig gemacht');
  await expect(detail.getByTestId('entry-text')).toContainText('4.000 Wildbienen');
  await expect(detail.getByTestId('entry-original')).toHaveCount(0);

  // Die zurückgenommene Version bleibt in der Historie.
  await expect(detail.getByTestId('versions')).toContainText('Version 2');
});

test('„Dieses Gespräch ist nicht von mir“ blendet den Faden aus', async ({ page }) => {
  await loadDemo(page);
  await search(page, 'Malte');
  const count = page.getByTestId('result-count');
  await expect(count).not.toHaveText('0 Treffer');
  await page.getByTestId('hit').first().click();
  await page.getByRole('button', { name: 'Dieses Gespräch ist nicht von mir' }).click();
  await expect(page.getByRole('status')).toContainText('nicht von mir');
  await expect(count).toHaveText('0 Treffer');

  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(count).not.toHaveText('0 Treffer');
});

test('Offline: die App öffnet sich, wenn der Server weg ist', async ({ page }) => {
  // Eigener Server, der sich wirklich abschalten lässt (Flugmodus-Ersatz).
  const server = await startStaticServer();
  const serverUrl = server.url;
  try {
    await page.goto(server.url);
    await expect(page.getByRole('heading', { name: 'Willkommen bei Denkspur' })).toBeVisible();
    // Warten, bis der Service Worker aktiv ist und die Seite kontrolliert.
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  } finally {
    await server.stop();
  }

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Willkommen bei Denkspur' })).toBeVisible();
  // Direkter Aufruf einer Unterseite: kommt offline aus dem Service-Worker-Cache.
  await page.goto(`${serverUrl}diagnose`);
  await expect(page.getByTestId('diag-vfs')).toContainText('opfs-sahpool');
});
