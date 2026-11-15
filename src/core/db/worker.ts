/// <reference lib="webworker" />
/**
 * DB-Worker: öffnet SQLite-WASM mit dem VFS „opfs-sahpool“ (läuft in Safari
 * ohne COOP/COEP-Header), führt die Migrationen aus und stellt DenkspurApi per Comlink bereit.
 * Ist OPFS nicht verfügbar, wird auf eine Datenbank im Speicher ausgewichen –
 * die Oberfläche zeigt dann eine deutliche Warnung.
 */
import sqlite3InitModule, { type SAHPoolUtil, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import * as Comlink from 'comlink';
import { DenkspurApiImpl, type DbHost, type OpenedDb } from '../api/impl';
import { openMemoryDb, wrapDatabase } from './sqlite';

const DB_FILE = '/denkspur.sqlite3';
const POOL_DIR = '.denkspur-sahpool';

let sqlite3: Sqlite3Static | null = null;
let pool: SAHPoolUtil | null = null;

async function getSqlite(): Promise<Sqlite3Static> {
  if (!sqlite3) sqlite3 = await sqlite3InitModule();
  return sqlite3;
}

function describe(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

const host: DbHost = {
  async open(): Promise<OpenedDb> {
    const s = await getSqlite();
    const version = s.version.libVersion;
    try {
      pool ??= await s.installOpfsSAHPoolVfs({ directory: POOL_DIR, initialCapacity: 6 });
      const raw = new pool.OpfsSAHPoolDb(DB_FILE);
      return { db: wrapDatabase(raw), vfs: 'opfs-sahpool', sqliteVersion: version, warning: null };
    } catch (err) {
      console.warn('DB: opfs-sahpool nicht verfügbar, weiche auf Speicher aus –', describe(err));
      return {
        db: openMemoryDb(s),
        vfs: 'memory',
        sqliteVersion: version,
        warning: `Dauerhafter Speicher (OPFS) nicht verfügbar: ${describe(err)}`,
      };
    }
  },
  async reset(current: OpenedDb): Promise<OpenedDb> {
    current.db.close();
    if (current.vfs === 'opfs-sahpool' && pool) {
      pool.unlink(DB_FILE);
    }
    return host.open();
  },
};

const api = new DenkspurApiImpl(host);
Comlink.expose(api);
