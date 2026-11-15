import type { Db } from './types';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** Alle Migrationen aus ./migrations (per ?raw eingelesen), aufsteigend sortiert. */
export function bundledMigrations(): Migration[] {
  const files = import.meta.glob<string>('./migrations/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  return parseMigrations(files);
}

export function parseMigrations(files: Record<string, string>): Migration[] {
  const list: Migration[] = [];
  for (const [path, sql] of Object.entries(files)) {
    const name = path.split('/').pop() ?? path;
    const match = /^(\d{4})_.+\.sql$/.exec(name);
    if (!match) throw new Error(`migrate: ungültiger Dateiname ${name}`);
    list.push({ version: Number(match[1]), name, sql });
  }
  list.sort((a, b) => a.version - b.version);
  list.forEach((m, i) => {
    if (m.version !== i + 1) throw new Error(`migrate: Lücke in den Migrationen bei ${m.name}`);
  });
  return list;
}

export function currentSchemaVersion(db: Db): number {
  const hasMeta = db.get<{ n: number }>(
    "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'meta'",
  );
  if (!hasMeta || hasMeta.n === 0) return 0;
  const row = db.get<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'");
  return row ? Number(row.value) : 0;
}

/**
 * Wendet alle noch fehlenden Migrationen an, jede in einer eigenen Transaktion.
 * Die Migration selbst darf meta.schema_version setzen (0001 tut das), der Runner
 * stellt den Wert danach in jedem Fall sicher.
 */
export function migrate(db: Db, migrations: Migration[] = bundledMigrations()): { from: number; to: number } {
  const from = currentSchemaVersion(db);
  for (const m of migrations) {
    if (m.version <= from) continue;
    db.tx(() => {
      db.exec(m.sql);
      db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)", [String(m.version)]);
    });
  }
  // PRAGMA foreign_keys wirkt nicht innerhalb einer Transaktion – nach der Migration erneut setzen.
  db.exec('PRAGMA foreign_keys = ON');
  return { from, to: currentSchemaVersion(db) };
}
