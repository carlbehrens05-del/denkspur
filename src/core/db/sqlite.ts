import type { BindableValue, Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import type { Db } from './types';

function toBindable(v: unknown): BindableValue {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint') return v;
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return v;
  if (v instanceof Int8Array) return v;
  throw new Error(`db: nicht bindbarer Parameter vom Typ ${typeof v}`);
}

function bind(params?: unknown[]): BindableValue[] | undefined {
  return params && params.length > 0 ? params.map(toBindable) : undefined;
}

/** Db-Implementierung über die oo1-API von SQLite-WASM. */
export function wrapDatabase(raw: Database): Db {
  let depth = 0;
  let spCounter = 0;
  const db: Db = {
    run(sql, params) {
      raw.exec({ sql, bind: bind(params) });
    },
    get<T>(sql: string, params?: unknown[]) {
      return raw.selectObject(sql, bind(params)) as T | undefined;
    },
    all<T>(sql: string, params?: unknown[]) {
      return raw.selectObjects(sql, bind(params)) as T[];
    },
    exec(sql) {
      raw.exec(sql);
    },
    changes() {
      return raw.changes() as number;
    },
    tx<T>(fn: () => T): T {
      if (depth === 0) {
        raw.exec('BEGIN IMMEDIATE');
        depth++;
        try {
          const result = fn();
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          raw.exec('ROLLBACK');
          throw err;
        } finally {
          depth--;
        }
      }
      const sp = `sp_${++spCounter}`;
      raw.exec(`SAVEPOINT ${sp}`);
      depth++;
      try {
        const result = fn();
        raw.exec(`RELEASE ${sp}`);
        return result;
      } catch (err) {
        raw.exec(`ROLLBACK TO ${sp}`);
        raw.exec(`RELEASE ${sp}`);
        throw err;
      } finally {
        depth--;
      }
    },
    close() {
      raw.close();
    },
  };
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

/** Datenbank im Speicher (Tests unter Node, Fallback ohne OPFS). */
export function openMemoryDb(sqlite3: Sqlite3Static): Db {
  return wrapDatabase(new sqlite3.oo1.DB(':memory:', 'c'));
}
