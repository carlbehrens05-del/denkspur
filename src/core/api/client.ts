/**
 * Comlink-Proxy im Haupt-Thread. Die Oberfläche spricht nur über dieses Objekt
 * mit den Daten. diagnostics() wird um Werte ergänzt, die nur der Haupt-Thread kennt.
 */
import * as Comlink from 'comlink';
import { detectStandalone, passkeyPrfSupport, storageInfo } from './platform';
import type { DenkspurApi, Diagnostics } from './contract';
import type { DenkspurApiExtras } from './impl';

export type DenkspurClient = DenkspurApi & DenkspurApiExtras;

export function createClient(): DenkspurClient {
  const worker = new Worker(new URL('../db/worker.ts', import.meta.url), {
    type: 'module',
    name: 'denkspur-db',
  });
  const remote = Comlink.wrap<DenkspurClient>(worker);

  async function diagnostics(): Promise<Diagnostics> {
    const base = await remote.diagnostics();
    const storage = await storageInfo();
    return {
      ...base,
      persisted: storage.persisted ?? base.persisted,
      quotaBytes: storage.quotaBytes ?? base.quotaBytes,
      usageBytes: storage.usageBytes ?? base.usageBytes,
      standalone: detectStandalone(),
      webgpu: 'gpu' in navigator,
      passkeyPrf: await passkeyPrfSupport(),
      userAgent: navigator.userAgent,
    };
  }

  return new Proxy({} as DenkspurClient, {
    get(_target, prop) {
      if (prop === 'diagnostics') return diagnostics;
      if (prop === 'then') return undefined; // kein „thenable“
      return (...args: unknown[]) =>
        (remote as unknown as Record<string | symbol, (...a: unknown[]) => unknown>)[prop]?.(...args);
    },
  });
}
