import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, chromium, webkit } from '@playwright/test';

/**
 * Jeder Test bekommt ein eigenes, persistentes Browser-Profil.
 * Grund: WebKit stellt OPFS (createSyncAccessHandle) in Playwrights flüchtigen
 * Kontexten – wie Safari im privaten Modus – nicht bereit. Ein persistentes Profil
 * entspricht dem echten Safari bzw. der installierten App.
 */
export const test = base.extend({
  context: async ({ browserName }, use, testInfo) => {
    const dir = mkdtempSync(join(tmpdir(), 'denkspur-e2e-'));
    const u = testInfo.project.use;
    const type = browserName === 'webkit' ? webkit : chromium;
    const context = await type.launchPersistentContext(dir, {
      baseURL: u.baseURL,
      locale: u.locale,
      timezoneId: u.timezoneId,
      viewport: u.viewport,
      userAgent: u.userAgent,
      deviceScaleFactor: u.deviceScaleFactor,
      isMobile: u.isMobile,
      hasTouch: u.hasTouch,
    });
    await use(context);
    await context.close();
    rmSync(dir, { recursive: true, force: true });
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';
