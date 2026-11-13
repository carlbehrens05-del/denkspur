import { describe, expect, it } from 'vitest';
import {
  correctEntry,
  findEntry,
  insertEntry,
  listEntries,
  markEntryNotMine,
} from '../../src/core/services/entries';
import { listOperations, undo } from '../../src/core/services/operations';
import { search, snippetToHtml, toFtsQuery } from '../../src/core/services/search';
import { getSettings, updateSettings } from '../../src/core/services/settings';
import { createSource } from '../../src/core/services/sources';
import { stats } from '../../src/core/services/stats';
import { ensureThread, markThreadNotMine } from '../../src/core/services/threads';
import { undoRegistry } from '../../src/core/services/undoRegistry';
import { migratedCtx } from './helpers';

async function seeded() {
  const ctx = await migratedCtx();
  const src = createSource(ctx, { kind: 'demo', label: 'Test', decision: 'include' });
  const thread = ensureThread(ctx, {
    sourceId: src.id,
    externalId: 't1',
    title: 'Facharbeit',
    startedAt: '2026-03-18T10:00:00.000Z',
  });
  const base = {
    sourceId: src.id,
    threadId: thread.id,
    kind: 'message' as const,
    role: 'originator' as const,
  };
  const e1 = insertEntry(ctx, {
    ...base,
    originalCreatedAt: '2026-03-18T10:00:00.000Z',
    text: 'Es waren 4.000 Wildbienen im Park',
  });
  const e2 = insertEntry(ctx, {
    ...base,
    role: 'assistant',
    parentId: e1.id,
    originalCreatedAt: '2026-03-18T10:01:00.000Z',
    text: 'Das ist eine Frage über die Größe der Fläche.',
  });
  return { ctx, src, thread, e1: e1.id, e2: e2.id, base };
}

describe('Einträge: Einfügen und Duplikate', () => {
  it('erkennt Duplikate über den Inhalts-Hash', async () => {
    const { ctx, base, e1 } = await seeded();
    const again = insertEntry(ctx, {
      ...base,
      originalCreatedAt: '2026-03-18T10:00:00.000Z',
      text: 'Es waren 4.000 Wildbienen im Park',
    });
    expect(again).toEqual({ id: e1, duplicate: true });
    expect(ctx.db.get<{ n: number }>('SELECT count(*) AS n FROM entries')?.n).toBe(2);
  });

  it('gleicher Text zu anderer Zeit ist kein Duplikat', async () => {
    const { ctx, base } = await seeded();
    const other = insertEntry(ctx, {
      ...base,
      originalCreatedAt: '2026-03-19T10:00:00.000Z',
      text: 'Es waren 4.000 Wildbienen im Park',
    });
    expect(other.duplicate).toBe(false);
  });

  it('listet sichtbare Einträge mit Filtern', async () => {
    const { ctx } = await seeded();
    expect(listEntries(ctx, {}).total).toBe(2);
    expect(listEntries(ctx, { roles: ['assistant'] }).total).toBe(1);
    expect(listEntries(ctx, { from: '2026-03-18T10:00:30.000Z' }).total).toBe(1);
    expect(listEntries(ctx, { text: 'Wildbienen' }).total).toBe(1);
  });
});

describe('Korrektur und Rückgängig', () => {
  it('legt eine neue Version an, das Original bleibt', async () => {
    const { ctx, e1 } = await seeded();
    const res = correctEntry(ctx, e1, 'Es waren 400 Wildbienen im Park', 'Tippfehler');
    expect(res.undoable).toBe(true);
    const entry = findEntry(ctx, e1);
    expect(entry?.text).toBe('Es waren 400 Wildbienen im Park');
    expect(entry?.originalText).toBe('Es waren 4.000 Wildbienen im Park');
    expect(entry?.currentVersion).toBe(2);
    expect(entry?.isCorrected).toBe(true);
    const op = listOperations(ctx)[0];
    expect(op?.type).toBe('entry.correct');
    expect(op?.inverse).toMatchObject({ entryId: e1, restoreVersion: 1, version: 2 });
  });

  it('aktualisiert den Suchindex auf den neuen Text', async () => {
    const { ctx, e1 } = await seeded();
    correctEntry(ctx, e1, 'Es waren 400 Wildbienen im Park');
    expect(search(ctx, { text: '400' }).hits.map((h) => h.target.id)).toContain(e1);
    expect(search(ctx, { text: '"4.000"' }).total).toBe(0);
  });

  it('Rückgängig stellt die vorige Version wieder her und protokolliert das', async () => {
    const { ctx, e1 } = await seeded();
    const res = correctEntry(ctx, e1, 'Es waren 400 Wildbienen im Park');
    const u = undo(ctx, undoRegistry, res.opId);
    expect(u.message).toMatch(/rückgängig/);
    const entry = findEntry(ctx, e1);
    expect(entry?.text).toBe('Es waren 4.000 Wildbienen im Park');
    expect(entry?.currentVersion).toBe(1);
    // Version 2 bleibt als Historie erhalten
    expect(ctx.db.get<{ n: number }>('SELECT count(*) AS n FROM entry_versions')?.n).toBe(1);
    const ops = listOperations(ctx);
    expect(ops[0]).toMatchObject({ type: 'undo', undoOf: res.opId });
    expect(ops[1]?.undoneAt).not.toBeNull();
    expect(search(ctx, { text: '"4.000"' }).total).toBe(1);
  });

  it('Rückgängig ohne ID nimmt die letzte Aktion; doppeltes Rückgängig wird abgelehnt', async () => {
    const { ctx, e1 } = await seeded();
    const res = correctEntry(ctx, e1, 'Version zwei');
    undo(ctx, undoRegistry);
    expect(findEntry(ctx, e1)?.currentVersion).toBe(1);
    expect(() => undo(ctx, undoRegistry, res.opId)).toThrow(/bereits/);
    expect(() => undo(ctx, undoRegistry)).toThrow(/nichts/);
  });

  it('nach Rückgängig bekommt die nächste Korrektur eine neue Versionsnummer', async () => {
    const { ctx, e1 } = await seeded();
    const r1 = correctEntry(ctx, e1, 'Version zwei');
    undo(ctx, undoRegistry, r1.opId);
    correctEntry(ctx, e1, 'Version drei');
    expect(findEntry(ctx, e1)?.currentVersion).toBe(3);
  });

  it('lehnt Rückgängig einer älteren Korrektur ab, wenn danach erneut korrigiert wurde', async () => {
    const { ctx, e1 } = await seeded();
    const r1 = correctEntry(ctx, e1, 'Version zwei');
    correctEntry(ctx, e1, 'Version drei');
    expect(() => undo(ctx, undoRegistry, r1.opId)).toThrow(/neuere Änderung/);
    expect(findEntry(ctx, e1)?.text).toBe('Version drei');
  });

  it('lehnt leere oder unveränderte Korrekturen ab', async () => {
    const { ctx, e1 } = await seeded();
    expect(() => correctEntry(ctx, e1, '  ')).toThrow(/leer/);
    expect(() => correctEntry(ctx, e1, 'Es waren 4.000 Wildbienen im Park')).toThrow(/unverändert/);
    expect(listOperations(ctx)).toHaveLength(0);
  });
});

describe('Suche', () => {
  it('findet „über“ mit „uber“ und „Größe“ mit „grosse“ nicht, aber mit „große“', async () => {
    const { ctx, e2 } = await seeded();
    expect(search(ctx, { text: 'uber' }).hits.map((h) => h.target.id)).toEqual([e2]);
    expect(search(ctx, { text: 'Grösse' }).total).toBe(0); // ß ≠ ss im unicode61-Tokenizer
    expect(search(ctx, { text: 'große' }).total).toBe(1);
    expect(search(ctx, { text: 'grosse' }).total).toBe(0);
  });

  it('sucht Wörter als Präfix und liefert Snippets mit <mark>', async () => {
    const { ctx } = await seeded();
    const res = search(ctx, { text: 'Wildbien' });
    expect(res.total).toBe(1);
    expect(res.hits[0]?.snippet).toContain('<mark>Wildbienen</mark>');
    expect(res.hits[0]?.title).toBe('Facharbeit');
  });

  it('maskiert HTML im Snippet', () => {
    expect(snippetToHtml('<b>\u0001x\u0002</b>')).toBe('&lt;b&gt;<mark>x</mark>&lt;/b&gt;');
  });

  it('übersteht ungültige FTS-Syntax', async () => {
    const { ctx } = await seeded();
    expect(() => search(ctx, { text: '"Wildbienen' })).not.toThrow();
    expect(search(ctx, { text: '4.000 (' }).total).toBeGreaterThanOrEqual(0);
    expect(toFtsQuery('   ')).toBeNull();
  });

  it('blendet „nicht von mir“ aus und zeigt es nach Rückgängig wieder', async () => {
    const { ctx, thread } = await seeded();
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(1);
    const res = markThreadNotMine(ctx, thread.id);
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(0);
    expect(stats(ctx).entries).toBe(0);
    undo(ctx, undoRegistry, res.opId);
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(1);
  });

  it('einzelner Eintrag „nicht von mir“ ist rückgängig machbar', async () => {
    const { ctx, e1 } = await seeded();
    const res = markEntryNotMine(ctx, e1);
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(0);
    expect(() => markEntryNotMine(ctx, e1)).toThrow(/bereits/);
    undo(ctx, undoRegistry, res.opId);
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(1);
  });

  it('respektiert die Entscheidung der Quelle', async () => {
    const { ctx, src } = await seeded();
    ctx.db.run("UPDATE sources SET decision = 'later' WHERE id = ?", [src.id]);
    expect(search(ctx, { text: 'Wildbienen' }).total).toBe(0);
  });
});

describe('Einstellungen', () => {
  it('liefert Standards, speichert Änderungen und macht sie rückgängig', async () => {
    const ctx = await migratedCtx();
    expect(getSettings(ctx).theme).toBe('system');
    const { settings, op } = updateSettings(ctx, { theme: 'dunkel' });
    expect(settings.theme).toBe('dunkel');
    expect(op?.undoable).toBe(true);
    undo(ctx, undoRegistry);
    expect(getSettings(ctx).theme).toBe('system');
  });

  it('der Datenschutzfilter ist nicht abschaltbar', async () => {
    const ctx = await migratedCtx();
    const patch = { privacy: { redactBeforeSend: false, previewBeforeSend: false } } as unknown as Parameters<
      typeof updateSettings
    >[1];
    const { settings } = updateSettings(ctx, patch);
    expect(settings.privacy.redactBeforeSend).toBe(true);
    expect(settings.privacy.previewBeforeSend).toBe(false);
  });
});
