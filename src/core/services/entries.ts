import type { Page, RecordFilter } from '../api/contract';
import { DenkspurError } from '../api/errors';
import type { Entry, EntryKind, EntryRole, EntryVersion, Id, OpResult, Tag } from '../model/types';
import { entryContentHash } from '../util/hash';
import type { Ctx } from './context';
import { recordOp, type UndoHandler } from './operations';
import { reindexEntry, toFtsQuery } from './search';

interface EntryRow {
  id: string;
  source_id: string;
  import_id: string | null;
  external_id: string | null;
  thread_id: string | null;
  parent_id: string | null;
  kind: EntryKind;
  role: EntryRole;
  original_created_at: string;
  ingested_at: string;
  blob_sha: string | null;
  original_text: string;
  content_hash: string;
  current_version: number;
  excluded: number;
  not_mine: number;
  text: string;
  is_corrected: number;
}

export function mapEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    sourceId: r.source_id,
    importId: r.import_id,
    externalId: r.external_id,
    threadId: r.thread_id,
    parentId: r.parent_id,
    kind: r.kind,
    role: r.role,
    originalCreatedAt: r.original_created_at,
    ingestedAt: r.ingested_at,
    blobSha: r.blob_sha,
    originalText: r.original_text,
    text: r.text,
    contentHash: r.content_hash,
    currentVersion: r.current_version,
    isCorrected: Boolean(r.is_corrected),
    excluded: Boolean(r.excluded),
    notMine: Boolean(r.not_mine),
  };
}

export interface InsertEntryInput {
  sourceId: Id;
  importId?: Id | null;
  externalId?: string | null;
  threadId?: Id | null;
  parentId?: Id | null;
  kind: EntryKind;
  role: EntryRole;
  originalCreatedAt: string;
  text: string;
  blobSha?: string | null;
  /** Feste ID (z. B. deterministische Demo-Daten). Standard: neue ID. */
  id?: Id;
}

export interface InsertEntryResult {
  id: Id;
  duplicate: boolean;
}

/**
 * Fügt einen Eintrag ein (nur anhängen). Duplikate werden über den Inhalts-Hash
 * erkannt und nicht erneut eingefügt. Pflegt den Suchindex.
 * Keine eigene Operation: läuft immer innerhalb einer übergeordneten Operation (z. B. import.run).
 */
export function insertEntry(ctx: Ctx, input: InsertEntryInput): InsertEntryResult {
  const hash = entryContentHash(input.kind, input.role, input.originalCreatedAt, input.text);
  const existing = ctx.db.get<{ id: string }>('SELECT id FROM entries WHERE content_hash = ?', [hash]);
  if (existing) return { id: existing.id, duplicate: true };
  const id = input.id ?? ctx.id(input.originalCreatedAt);
  ctx.db.run(
    `INSERT INTO entries (id, source_id, import_id, external_id, thread_id, parent_id, kind, role,
       original_created_at, ingested_at, blob_sha, original_text, content_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.sourceId,
      input.importId ?? null,
      input.externalId ?? null,
      input.threadId ?? null,
      input.parentId ?? null,
      input.kind,
      input.role,
      input.originalCreatedAt,
      ctx.now(),
      input.blobSha ?? null,
      input.text,
      hash,
    ],
  );
  reindexEntry(ctx, id);
  return { id, duplicate: false };
}

export function findEntry(ctx: Ctx, id: Id): Entry | undefined {
  const row = ctx.db.get<EntryRow>('SELECT * FROM entries_current WHERE id = ?', [id]);
  return row ? mapEntry(row) : undefined;
}

interface VersionRow {
  entry_id: string;
  version: number;
  text: string;
  created_at: string;
  actor: 'user' | 'agent';
  reason: string | null;
  op_id: string | null;
}

export function listVersions(ctx: Ctx, entryId: Id): EntryVersion[] {
  return ctx.db
    .all<VersionRow>('SELECT * FROM entry_versions WHERE entry_id = ? ORDER BY version', [entryId])
    .map((v) => ({
      entryId: v.entry_id,
      version: v.version,
      text: v.text,
      createdAt: v.created_at,
      actor: v.actor,
      reason: v.reason,
      opId: v.op_id,
    }));
}

export function listEntryTags(ctx: Ctx, entryId: Id): Tag[] {
  return ctx.db
    .all<{
      id: string;
      name: string;
      schema_id: string | null;
      created_by: 'user' | 'agent';
      created_at: string;
    }>(
      `SELECT t.* FROM tags t JOIN taggings g ON g.tag_id = t.id
       WHERE g.target_type = 'entry' AND g.target_id = ? ORDER BY t.name`,
      [entryId],
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      schemaId: t.schema_id,
      createdBy: t.created_by,
      createdAt: t.created_at,
    }));
}

/**
 * Einträge auflisten (nur sichtbare). Unterstützt Zeitraum, Quellen, Rollen und Freitext.
 * tagIds/folderIds folgen in M1.
 */
export function listEntries(ctx: Ctx, filter: RecordFilter & Page): { items: Entry[]; total: number } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.from) {
    where.push('ev.original_created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('ev.original_created_at <= ?');
    params.push(filter.to);
  }
  if (filter.sourceIds?.length) {
    where.push(`ev.source_id IN (${filter.sourceIds.map(() => '?').join(', ')})`);
    params.push(...filter.sourceIds);
  }
  if (filter.roles?.length) {
    where.push(`ev.role IN (${filter.roles.map(() => '?').join(', ')})`);
    params.push(...filter.roles);
  }
  const fts = filter.text ? toFtsQuery(filter.text) : null;
  if (fts) {
    where.push(
      `ev.id IN (SELECT target_id FROM search_index WHERE search_index MATCH ? AND target_type = 'entry')`,
    );
    params.push(fts.query);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total =
    ctx.db.get<{ n: number }>(`SELECT count(*) AS n FROM entries_visible ev ${whereSql}`, params)?.n ?? 0;
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const offset = Math.max(filter.offset ?? 0, 0);
  const items = ctx.db
    .all<EntryRow>(
      `SELECT ev.* FROM entries_visible ev ${whereSql}
       ORDER BY ev.original_created_at DESC, ev.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    .map(mapEntry);
  return { items, total };
}

export function listReplies(ctx: Ctx, entryId: Id): Entry[] {
  return ctx.db
    .all<EntryRow>('SELECT * FROM entries_visible WHERE parent_id = ? ORDER BY original_created_at, id', [
      entryId,
    ])
    .map(mapEntry);
}

/** Korrektur als neue Version. Das Original bleibt unverändert erhalten. */
export function correctEntry(
  ctx: Ctx,
  id: Id,
  newText: string,
  reason?: string,
  actor: 'user' | 'agent' = 'user',
): OpResult {
  return ctx.db.tx(() => {
    const entry = findEntry(ctx, id);
    if (!entry) throw new DenkspurError('Eintrag nicht gefunden.');
    if (newText.trim() === '') throw new DenkspurError('Der korrigierte Text darf nicht leer sein.');
    if (newText === entry.text) throw new DenkspurError('Der Text ist unverändert.');
    const max = ctx.db.get<{ v: number | null }>(
      'SELECT max(version) AS v FROM entry_versions WHERE entry_id = ?',
      [id],
    );
    const version = Math.max(max?.v ?? 1, 1) + 1;
    const opId = recordOp(ctx, {
      type: 'entry.correct',
      actor,
      payload: { entryId: id, version, reason: reason ?? null },
      inverse: { entryId: id, restoreVersion: entry.currentVersion, version },
    });
    ctx.db.run(
      'INSERT INTO entry_versions (entry_id, version, text, created_at, actor, reason, op_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, version, newText, ctx.now(), actor, reason ?? null, opId],
    );
    ctx.db.run('UPDATE entries SET current_version = ? WHERE id = ?', [version, id]);
    reindexEntry(ctx, id);
    return { opId, undoable: true, message: 'Korrektur gespeichert' };
  });
}

export const correctEntryUndo: UndoHandler = {
  label: 'Korrektur',
  apply(ctx, inverse) {
    const entryId = String(inverse.entryId);
    const version = Number(inverse.version);
    const restore = Number(inverse.restoreVersion);
    const entry = findEntry(ctx, entryId);
    if (!entry) throw new DenkspurError('Eintrag nicht gefunden.');
    if (entry.currentVersion !== version) {
      throw new DenkspurError(
        'Der Eintrag wurde danach erneut geändert. Bitte zuerst die neuere Änderung rückgängig machen.',
      );
    }
    ctx.db.run('UPDATE entries SET current_version = ? WHERE id = ?', [restore, entryId]);
    reindexEntry(ctx, entryId);
  },
};

/** Ein einzelner Eintrag ist „nicht von mir“. */
export function markEntryNotMine(ctx: Ctx, id: Id): OpResult {
  return ctx.db.tx(() => {
    const entry = findEntry(ctx, id);
    if (!entry) throw new DenkspurError('Eintrag nicht gefunden.');
    if (entry.notMine) throw new DenkspurError('Dieser Eintrag ist bereits als „nicht von mir“ markiert.');
    const opId = recordOp(ctx, {
      type: 'entry.not_mine',
      payload: { entryId: id },
      inverse: { entryId: id, previous: 0 },
    });
    ctx.db.run('UPDATE entries SET not_mine = 1 WHERE id = ?', [id]);
    return { opId, undoable: true, message: 'Eintrag als „nicht von mir“ markiert' };
  });
}

export const entryNotMineUndo: UndoHandler = {
  label: '„Nicht von mir“',
  apply(ctx, inverse) {
    ctx.db.run('UPDATE entries SET not_mine = ? WHERE id = ?', [
      Number(inverse.previous ?? 0),
      String(inverse.entryId),
    ]);
  },
};
