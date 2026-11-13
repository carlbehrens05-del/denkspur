import type { AppSettings, OpResult } from '../model/types';
import { parseJson, type Ctx } from './context';
import { recordOp, type UndoHandler } from './operations';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  palette: 'glut',
  llm: { provider: 'none', model: null, embeddingModel: null, monthlyCapUsdMicros: null },
  privacy: { redactBeforeSend: true, previewBeforeSend: true },
  backup: { reminderDays: 14, lastBackupAt: null },
  lock: { method: 'none', autoLockMinutes: 10 },
};

type Key = keyof AppSettings;
const KEYS = Object.keys(DEFAULT_SETTINGS) as Key[];

export function getSettings(ctx: Ctx): AppSettings {
  const rows = ctx.db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const result = structuredClone(DEFAULT_SETTINGS) as unknown as Record<Key, unknown>;
  for (const key of KEYS) {
    const raw = stored.get(key);
    if (raw === undefined) continue;
    const value = parseJson<unknown>(raw, undefined);
    if (value === undefined) continue;
    const def = DEFAULT_SETTINGS[key];
    result[key] =
      typeof def === 'object' && def !== null && typeof value === 'object' && value !== null
        ? { ...def, ...(value as object) }
        : value;
  }
  const settings = result as unknown as AppSettings;
  settings.privacy.redactBeforeSend = true; // nicht abschaltbar
  return settings;
}

function writeKey(ctx: Ctx, key: string, value: unknown): void {
  if (value === null || value === undefined) {
    ctx.db.run('DELETE FROM settings WHERE key = ?', [key]);
  } else {
    ctx.db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [
      key,
      JSON.stringify(value),
      ctx.now(),
    ]);
  }
}

export function updateSettings(
  ctx: Ctx,
  patch: Partial<AppSettings>,
): { settings: AppSettings; op: OpResult | null } {
  return ctx.db.tx(() => {
    const before = getSettings(ctx);
    const changedKeys = KEYS.filter((k) => k in patch && patch[k] !== undefined);
    if (changedKeys.length === 0) return { settings: before, op: null };
    const previous: Record<string, unknown> = {};
    for (const k of changedKeys) {
      const row = ctx.db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [k]);
      previous[k] = row ? parseJson<unknown>(row.value, null) : null;
    }
    const merged: Record<string, unknown> = {};
    for (const k of changedKeys) {
      const cur = before[k];
      const next = patch[k];
      merged[k] =
        typeof cur === 'object' && cur !== null && typeof next === 'object' && next !== null
          ? { ...cur, ...next }
          : next;
    }
    if (merged.privacy && typeof merged.privacy === 'object') {
      (merged.privacy as AppSettings['privacy']).redactBeforeSend = true;
    }
    const opId = recordOp(ctx, {
      type: 'settings.update',
      payload: { keys: changedKeys },
      inverse: { previous },
    });
    for (const k of changedKeys) writeKey(ctx, k, merged[k]);
    return { settings: getSettings(ctx), op: { opId, undoable: true, message: 'Einstellungen gespeichert' } };
  });
}

export const settingsUndo: UndoHandler = {
  label: 'Einstellungsänderung',
  apply(ctx, inverse) {
    const previous = (inverse.previous ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(previous)) writeKey(ctx, k, v);
  },
};
