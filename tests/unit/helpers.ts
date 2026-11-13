import sqlite3InitModule, { type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { DenkspurApiImpl, type DbHost } from '../../src/core/api/impl';
import { migrate } from '../../src/core/db/migrate';
import { openMemoryDb } from '../../src/core/db/sqlite';
import type { Db } from '../../src/core/db/types';
import { createCtx, type Ctx } from '../../src/core/services/context';
import { createIdGenerator, seededRandom } from '../../src/core/util/ids';

let sqlite: Sqlite3Static | null = null;

export async function getSqlite(): Promise<Sqlite3Static> {
  sqlite ??= await sqlite3InitModule();
  return sqlite;
}

/** Fortlaufende Test-Uhr (jede Abfrage +1 Sekunde). */
export function testClock(start = '2026-11-13T10:00:00.000Z'): () => string {
  let t = Date.parse(start);
  return () => {
    t += 1000;
    return new Date(t).toISOString();
  };
}

export async function memoryDb(): Promise<Db> {
  return openMemoryDb(await getSqlite());
}

export async function migratedCtx(): Promise<Ctx> {
  const db = await memoryDb();
  migrate(db);
  const clock = testClock();
  return createCtx(
    db,
    clock,
    createIdGenerator(seededRandom(42), () => Date.parse(clock())),
  );
}

export async function memoryApi(): Promise<DenkspurApiImpl> {
  const s = await getSqlite();
  const host: DbHost = {
    async open() {
      return { db: openMemoryDb(s), vfs: 'memory', sqliteVersion: s.version.libVersion, warning: null };
    },
    async reset(current) {
      current.db.close();
      return host.open();
    },
  };
  return new DenkspurApiImpl(host, testClock());
}
