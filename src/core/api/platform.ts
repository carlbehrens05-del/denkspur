/**
 * Erkennung von Plattform-Eigenschaften im Haupt-Thread (kein React).
 * Speicher-Persistenz, Home-Bildschirm-Modus, Passkey-PRF.
 */

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/** true, wenn die App vom Home-Bildschirm (bzw. als installierte PWA) läuft. */
export function detectStandalone(): boolean {
  const nav = navigator as NavigatorWithStandalone;
  if (nav.standalone === true) return true;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches
    );
  } catch {
    return false;
  }
}

/** iPhone/iPad (iPadOS meldet sich als „Macintosh“ mit Touch). */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Safari (nicht Chrome/Firefox/Edge auf iOS, die eigene Kennungen tragen). */
export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/(CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android)/.test(ua);
}

export interface StorageInfo {
  persisted: boolean | null;
  quotaBytes: number | null;
  usageBytes: number | null;
}

export async function storageInfo(): Promise<StorageInfo> {
  const result: StorageInfo = { persisted: null, quotaBytes: null, usageBytes: null };
  try {
    if (navigator.storage?.persisted) result.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      result.quotaBytes = est.quota ?? null;
      result.usageBytes = est.usage ?? null;
    }
  } catch {
    // nicht verfügbar
  }
  return result;
}

/** Bittet den Browser, den Speicher nicht automatisch zu löschen. */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

interface PublicKeyCredentialWithCaps {
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
}

export async function passkeyPrfSupport(): Promise<boolean | 'unknown'> {
  try {
    const pkc = (globalThis as { PublicKeyCredential?: PublicKeyCredentialWithCaps }).PublicKeyCredential;
    if (!pkc) return false;
    if (!pkc.getClientCapabilities) return 'unknown';
    const caps = await pkc.getClientCapabilities();
    return 'extension:prf' in caps ? Boolean(caps['extension:prf']) : 'unknown';
  } catch {
    return 'unknown';
  }
}
