/**
 * Datenbank-Abstraktion (siehe docs/GLIEDERUNG.md, Abschnitt 2).
 * Gleiche Schnittstelle im Worker (OPFS) und in Tests unter Node (Speicher).
 * Erweiterung gegenüber der Gliederung: `exec` für Skripte mit mehreren
 * Anweisungen (Migrationen) und `close`.
 */
export interface Db {
  run(sql: string, params?: unknown[]): void;
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  /** Führt fn in einer Transaktion aus. Verschachtelte Aufrufe nutzen Savepoints. */
  tx<T>(fn: () => T): T;
  /** Mehrere Anweisungen ohne Parameter (z. B. Migrationen). */
  exec(sql: string): void;
  /** Anzahl der durch die letzte Anweisung geänderten Zeilen. */
  changes(): number;
  close(): void;
}
