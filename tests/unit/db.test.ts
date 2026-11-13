import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bundledMigrations, currentSchemaVersion, migrate, parseMigrations } from '../../src/core/db/migrate';
import { insertEntry } from '../../src/core/services/entries';
import { createSource } from '../../src/core/services/sources';
import { memoryDb, migratedCtx } from './helpers';

describe('Migrationen', () => {
  it('lesen 0001_init.sql unverändert ein', () => {
    const [first] = bundledMigrations();
    expect(first?.version).toBe(1);
    expect(first?.sql).toBe(readFileSync('src/core/db/migrations/0001_init.sql', 'utf8'));
  });

  it('legen das Schema an und setzen schema_version', async () => {
    const db = await memoryDb();
    expect(currentSchemaVersion(db)).toBe(0);
    expect(migrate(db)).toEqual({ from: 0, to: 1 });
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type IN ('table','view')");
    const names = tables.map((t) => t.name);
    for (const t of [
      'entries',
      'entry_versions',
      'entries_current',
      'entries_visible',
      'operations',
      'search_index',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('sind idempotent (zweiter Lauf ändert nichts)', async () => {
    const db = await memoryDb();
    migrate(db);
    expect(migrate(db)).toEqual({ from: 1, to: 1 });
  });

  it('wenden spätere Migrationen in Reihenfolge an', async () => {
    const db = await memoryDb();
    const list = parseMigrations({
      './migrations/0001_init.sql': readFileSync('src/core/db/migrations/0001_init.sql', 'utf8'),
      './migrations/0002_test.sql': 'CREATE TABLE test_extra (x INTEGER);',
    });
    expect(migrate(db, list)).toEqual({ from: 0, to: 2 });
    expect(
      db.get<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE name = 'test_extra'")?.n,
    ).toBe(1);
  });

  it('lehnen Lücken in der Nummerierung ab', () => {
    expect(() => parseMigrations({ './0001_a.sql': '', './0003_c.sql': '' })).toThrow(/Lücke/);
  });

  it('haben FTS5 mit remove_diacritics', async () => {
    const db = await memoryDb();
    migrate(db);
    expect(db.get<{ v: number }>("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS v")?.v).toBe(1);
  });

  it('rollen fehlgeschlagene Transaktionen vollständig zurück', async () => {
    const db = await memoryDb();
    migrate(db);
    expect(() =>
      db.tx(() => {
        db.run("INSERT INTO meta (key, value) VALUES ('x', '1')");
        throw new Error('Abbruch');
      }),
    ).toThrow('Abbruch');
    expect(db.get("SELECT * FROM meta WHERE key = 'x'")).toBeUndefined();
  });
});

describe('Unveränderlichkeit der Originale', () => {
  async function setup() {
    const ctx = await migratedCtx();
    const src = createSource(ctx, { kind: 'demo', label: 'Test', decision: 'include' });
    const { id } = insertEntry(ctx, {
      sourceId: src.id,
      kind: 'message',
      role: 'originator',
      originalCreatedAt: '2026-03-18T10:00:00.000Z',
      text: 'Es waren 4.000 Wildbienen',
    });
    return { ctx, id };
  }

  it('verhindert das Ändern des Originaltexts', async () => {
    const { ctx, id } = await setup();
    expect(() => ctx.db.run("UPDATE entries SET original_text = 'x' WHERE id = ?", [id])).toThrow(
      /unveraenderlich/,
    );
    expect(() => ctx.db.run("UPDATE entries SET original_created_at = 'x' WHERE id = ?", [id])).toThrow(
      /unveraenderlich/,
    );
  });

  it('verhindert das Löschen von Einträgen', async () => {
    const { ctx, id } = await setup();
    expect(() => ctx.db.run('DELETE FROM entries WHERE id = ?', [id])).toThrow(/nur anhaengen/);
  });

  it('verhindert das Ändern gespeicherter Versionen', async () => {
    const { ctx, id } = await setup();
    ctx.db.run(
      "INSERT INTO entry_versions (entry_id, version, text, created_at, actor) VALUES (?, 2, 'neu', '2026-01-01', 'user')",
      [id],
    );
    expect(() => ctx.db.run("UPDATE entry_versions SET text = 'anders' WHERE entry_id = ?", [id])).toThrow(
      /unveraenderlich/,
    );
  });
});
