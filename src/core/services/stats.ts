import type { RecordFilter, RecordStats } from '../api/contract';
import type { Ctx } from './context';

export function stats(ctx: Ctx, filter: RecordFilter = {}): RecordStats {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.from) {
    where.push('original_created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('original_created_at <= ?');
    params.push(filter.to);
  }
  if (filter.sourceIds?.length) {
    where.push(`source_id IN (${filter.sourceIds.map(() => '?').join(', ')})`);
    params.push(...filter.sourceIds);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const e = ctx.db.get<{ n: number; threads: number; first: string | null; last: string | null }>(
    `SELECT count(*) AS n, count(DISTINCT thread_id) AS threads,
            min(original_created_at) AS first, max(original_created_at) AS last
     FROM entries_visible ${whereSql}`,
    params,
  );
  const notes = ctx.db.get<{ n: number }>('SELECT count(*) AS n FROM notes WHERE archived = 0')?.n ?? 0;
  const sources = ctx.db.get<{ n: number }>('SELECT count(*) AS n FROM sources')?.n ?? 0;
  return {
    entries: e?.n ?? 0,
    threads: e?.threads ?? 0,
    notes,
    sources,
    firstEntryAt: e?.first ?? null,
    lastEntryAt: e?.last ?? null,
  };
}
