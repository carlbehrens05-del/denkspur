import type { SearchHit, SearchQuery, SearchResult } from '../api/contract';
import type { Id, TargetType } from '../model/types';
import type { Ctx } from './context';

/**
 * Volltextsuche über die FTS5-Tabelle search_index.
 * Der Index wird vom Service-Code gepflegt: bei jedem Einfügen und jeder neuen
 * Version wird die Zeile gelöscht und neu eingefügt.
 * Sichtbarkeit (ausgeschlossen, „nicht von mir“, Quelle nicht übernommen) wird
 * beim Suchen über entries_visible geprüft – der Index selbst bleibt vollständig.
 */

export function indexDocument(ctx: Ctx, type: TargetType, id: Id, title: string, body: string): void {
  ctx.db.run('DELETE FROM search_index WHERE target_type = ? AND target_id = ?', [type, id]);
  ctx.db.run('INSERT INTO search_index (target_type, target_id, title, body) VALUES (?, ?, ?, ?)', [
    type,
    id,
    title,
    body,
  ]);
}

/** Index eines Eintrags aus dem aktuellen Text neu aufbauen. */
export function reindexEntry(ctx: Ctx, entryId: Id): void {
  const row = ctx.db.get<{ text: string; title: string }>(
    `SELECT ec.text AS text, COALESCE(t.title, s.label) AS title
     FROM entries_current ec
     JOIN sources s ON s.id = ec.source_id
     LEFT JOIN threads t ON t.id = ec.thread_id
     WHERE ec.id = ?`,
    [entryId],
  );
  if (row) indexDocument(ctx, 'entry', entryId, row.title, row.text);
}

const FTS_SYNTAX = /["*():^]|\b(AND|OR|NOT|NEAR)\b/;

/**
 * Freitext → FTS5-Abfrage. Ohne FTS-Syntax wird jedes Wort als Präfix gesucht
 * („Bien“ findet „Bienen“). Mit FTS-Syntax wird die Eingabe direkt verwendet.
 */
export function toFtsQuery(text: string): { query: string; raw: boolean } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (FTS_SYNTAX.test(trimmed)) return { query: trimmed, raw: true };
  return { query: sanitizedQuery(trimmed), raw: false };
}

function sanitizedQuery(text: string): string {
  const tokens = text
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t}"*`).join(' ');
}

const MARK_OPEN = '\u0001';
const MARK_CLOSE = '\u0002';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Snippet-Text sicher machen: HTML maskieren, dann Treffer mit <mark> umschließen. */
export function snippetToHtml(raw: string): string {
  return escapeHtml(raw).split(MARK_OPEN).join('<mark>').split(MARK_CLOSE).join('</mark>');
}

interface HitRow {
  target_type: TargetType;
  target_id: string;
  title: string;
  snip: string;
  score: number;
  at: string | null;
}

export function search(ctx: Ctx, q: SearchQuery): SearchResult {
  const fts = toFtsQuery(q.text ?? '');
  if (!fts) return { hits: [], total: 0 };
  try {
    return runSearch(ctx, q, fts.query);
  } catch (err) {
    // Ungültige FTS-Syntax → noch einmal als einfache Wortsuche.
    if (fts.raw) return runSearch(ctx, q, sanitizedQuery(q.text ?? ''));
    throw err;
  }
}

function runSearch(ctx: Ctx, q: SearchQuery, ftsQuery: string): SearchResult {
  const scope = q.scope ?? ['entries', 'notes'];
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 500);
  const offset = Math.max(q.offset ?? 0, 0);
  const entryFilterOnly = (q.sourceIds?.length ?? 0) > 0 || (q.roles?.length ?? 0) > 0;

  const parts: string[] = [];
  const params: unknown[] = [`${MARK_OPEN}`, `${MARK_CLOSE}`, ftsQuery];

  if (scope.includes('entries')) {
    const where: string[] = [];
    if (q.from) {
      where.push('ev.original_created_at >= ?');
      params.push(q.from);
    }
    if (q.to) {
      where.push('ev.original_created_at <= ?');
      params.push(q.to);
    }
    if (q.sourceIds?.length) {
      where.push(`ev.source_id IN (${q.sourceIds.map(() => '?').join(', ')})`);
      params.push(...q.sourceIds);
    }
    if (q.roles?.length) {
      where.push(`ev.role IN (${q.roles.map(() => '?').join(', ')})`);
      params.push(...q.roles);
    }
    parts.push(
      `SELECT m.target_type, m.target_id, m.title, m.snip, m.score, ev.original_created_at AS at
       FROM m JOIN entries_visible ev ON m.target_type = 'entry' AND ev.id = m.target_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
    );
  }
  if (scope.includes('notes') && !entryFilterOnly) {
    const where: string[] = ['n.archived = 0'];
    if (q.from) {
      where.push('n.created_at >= ?');
      params.push(q.from);
    }
    if (q.to) {
      where.push('n.created_at <= ?');
      params.push(q.to);
    }
    parts.push(
      `SELECT m.target_type, m.target_id, m.title, m.snip, m.score, n.created_at AS at
       FROM m JOIN notes n ON m.target_type = 'note' AND n.id = m.target_id
       WHERE ${where.join(' AND ')}`,
    );
  }
  if (parts.length === 0) return { hits: [], total: 0 };

  const base = `WITH m AS MATERIALIZED (
      SELECT target_type, target_id, title,
             snippet(search_index, 3, ?, ?, '…', 14) AS snip,
             bm25(search_index, 0, 0, 0.5, 1.0) AS score
      FROM search_index WHERE search_index MATCH ?
    )
    ${parts.join(' UNION ALL ')}`;

  const total = ctx.db.get<{ n: number }>(`SELECT count(*) AS n FROM (${base})`, params)?.n ?? 0;
  const rows = ctx.db.all<HitRow>(`${base} ORDER BY score, at DESC LIMIT ? OFFSET ?`, [
    ...params,
    limit,
    offset,
  ]);
  const hits: SearchHit[] = rows.map((r) => ({
    target: { type: r.target_type, id: r.target_id },
    title: r.title,
    snippet: snippetToHtml(r.snip),
    at: r.at,
    // bm25: kleiner = besser. Für die Oberfläche: größer = besser.
    score: -r.score,
  }));
  return { hits, total };
}
