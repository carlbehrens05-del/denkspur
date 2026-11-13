import type { Page, RecordFilter } from '../api/contract';
import { DenkspurError } from '../api/errors';
import type { Entry, Id, OpResult, Thread } from '../model/types';
import type { Ctx } from './context';
import { mapEntry } from './entries';
import { recordOp, type UndoHandler } from './operations';

interface ThreadRow {
  id: string;
  source_id: string;
  external_id: string | null;
  title: string | null;
  started_at: string | null;
  not_mine: number;
}

export function mapThread(r: ThreadRow): Thread {
  return {
    id: r.id,
    sourceId: r.source_id,
    externalId: r.external_id,
    title: r.title,
    startedAt: r.started_at,
    notMine: Boolean(r.not_mine),
  };
}

export interface CreateThreadInput {
  sourceId: Id;
  externalId?: string | null;
  title?: string | null;
  startedAt?: string | null;
  id?: Id;
}

/** Faden anlegen oder – bei gleicher Quelle und externer ID – wiederverwenden. */
export function ensureThread(ctx: Ctx, input: CreateThreadInput): Thread {
  if (input.externalId) {
    const row = ctx.db.get<ThreadRow>('SELECT * FROM threads WHERE source_id = ? AND external_id = ?', [
      input.sourceId,
      input.externalId,
    ]);
    if (row) return mapThread(row);
  }
  const id = input.id ?? ctx.id(input.startedAt ?? undefined);
  ctx.db.run(
    'INSERT INTO threads (id, source_id, external_id, title, started_at, not_mine) VALUES (?, ?, ?, ?, ?, 0)',
    [id, input.sourceId, input.externalId ?? null, input.title ?? null, input.startedAt ?? null],
  );
  const created = findThread(ctx, id);
  if (!created) throw new Error('threads: Anlegen fehlgeschlagen');
  return created;
}

export function findThread(ctx: Ctx, id: Id): Thread | undefined {
  const row = ctx.db.get<ThreadRow>('SELECT * FROM threads WHERE id = ?', [id]);
  return row ? mapThread(row) : undefined;
}

/** Faden mit allen Einträgen (auch ausgeblendeten – der Leser zeigt sie gekennzeichnet). */
export function getThread(ctx: Ctx, id: Id): { thread: Thread; entries: Entry[] } {
  const thread = findThread(ctx, id);
  if (!thread) throw new DenkspurError('Faden nicht gefunden.');
  const entries = ctx.db
    .all<Parameters<typeof mapEntry>[0]>(
      'SELECT * FROM entries_current WHERE thread_id = ? ORDER BY original_created_at, id',
      [id],
    )
    .map(mapEntry);
  return { thread, entries };
}

export function listThreads(ctx: Ctx, filter: RecordFilter & Page): { items: Thread[]; total: number } {
  const where: string[] = ['t.not_mine = 0'];
  const params: unknown[] = [];
  if (filter.from) {
    where.push('t.started_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('t.started_at <= ?');
    params.push(filter.to);
  }
  if (filter.sourceIds?.length) {
    where.push(`t.source_id IN (${filter.sourceIds.map(() => '?').join(', ')})`);
    params.push(...filter.sourceIds);
  }
  const whereSql = `WHERE ${where.join(' AND ')} AND EXISTS (SELECT 1 FROM entries_visible ev WHERE ev.thread_id = t.id)`;
  const total = ctx.db.get<{ n: number }>(`SELECT count(*) AS n FROM threads t ${whereSql}`, params)?.n ?? 0;
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const offset = Math.max(filter.offset ?? 0, 0);
  const items = ctx.db
    .all<ThreadRow>(
      `SELECT t.* FROM threads t ${whereSql} ORDER BY t.started_at DESC, t.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    .map(mapThread);
  return { items, total };
}

/** Ganzer Faden ist „nicht von mir“ – verschwindet aus Suche, Gehirn und Notizen. */
export function markThreadNotMine(ctx: Ctx, id: Id): OpResult {
  return ctx.db.tx(() => {
    const thread = findThread(ctx, id);
    if (!thread) throw new DenkspurError('Faden nicht gefunden.');
    if (thread.notMine) throw new DenkspurError('Dieser Faden ist bereits als „nicht von mir“ markiert.');
    const opId = recordOp(ctx, {
      type: 'thread.not_mine',
      payload: { threadId: id },
      inverse: { threadId: id, previous: 0 },
    });
    ctx.db.run('UPDATE threads SET not_mine = 1 WHERE id = ?', [id]);
    return { opId, undoable: true, message: 'Gespräch als „nicht von mir“ markiert' };
  });
}

export const threadNotMineUndo: UndoHandler = {
  label: '„Nicht von mir“',
  apply(ctx, inverse) {
    ctx.db.run('UPDATE threads SET not_mine = ? WHERE id = ?', [
      Number(inverse.previous ?? 0),
      String(inverse.threadId),
    ]);
  },
};
