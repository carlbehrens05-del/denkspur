/**
 * Schreibt das Demo-Archiv über die normalen Services in die Datenbank.
 * Alles in einer Transaktion mit genau einer Operation „import.run“ (rückgängig machbar).
 * Ein zweites Laden erzeugt nur Duplikate (0 neu).
 */
import type { Id, OpResult } from '../core/model/types';
import type { Ctx } from '../core/services/context';
import { insertEntry } from '../core/services/entries';
import { addFolderMember, ensureFolder } from '../core/services/folders';
import { finishImport, startImport, type ImportStats } from '../core/services/imports';
import { insertNote } from '../core/services/notes';
import { recordOp } from '../core/services/operations';
import { createSource, findSource, touchSourceImport } from '../core/services/sources';
import { ensureThread } from '../core/services/threads';
import { createIdGenerator, seededRandom } from '../core/util/ids';
import {
  DEMO_FOLDERS,
  DEMO_SOURCES,
  generateDemoRecord,
  type DemoRecord,
  type DemoSourceKey,
} from './generator';

export interface DemoLoadResult extends OpResult {
  added: number;
  duplicates: number;
  notesAdded: number;
}

export function loadDemo(ctx: Ctx, record: DemoRecord = generateDemoRecord()): DemoLoadResult {
  // Deterministische IDs für Fäden, Einträge, Notizen und Ordner.
  const demoId = createIdGenerator(seededRandom(record.seed ^ 0x5eed));
  return ctx.db.tx(() => {
    const opId = recordOp(ctx, {
      type: 'import.run',
      payload: { kind: 'demo', label: 'Demo-Archiv' },
      inverse: {},
    });

    const sourceIds = new Map<DemoSourceKey, Id>();
    const importIds = new Map<DemoSourceKey, Id>();
    const stats = new Map<DemoSourceKey, ImportStats>();
    for (const s of DEMO_SOURCES) {
      const src =
        findSource(ctx, 'demo', s.label) ??
        createSource(ctx, { kind: 'demo', label: s.label, decision: 'include', whoseWords: s.whoseWords });
      sourceIds.set(s.key, src.id);
      importIds.set(s.key, startImport(ctx, src.id, opId));
      stats.set(s.key, { added: 0, duplicates: 0, skipped: 0, errors: 0 });
    }
    const sourceOf = (key: DemoSourceKey): Id => sourceIds.get(key) as Id;
    const count = (key: DemoSourceKey, duplicate: boolean) => {
      const st = stats.get(key) as ImportStats;
      if (duplicate) st.duplicates++;
      else st.added++;
    };

    const folderIds = new Map<string, Id>();
    const newFolderIds: Id[] = [];
    for (const f of DEMO_FOLDERS) {
      const res = ensureFolder(
        ctx,
        f.name,
        'user',
        '2026-03-01T08:00:00.000Z',
        demoId('2026-03-01T08:00:00.000Z'),
      );
      folderIds.set(f.key, res.id);
      if (res.created) newFolderIds.push(res.id);
    }

    for (const t of record.threads) {
      const sourceId = sourceOf(t.source);
      const thread = ensureThread(ctx, {
        sourceId,
        externalId: t.externalId,
        title: t.title,
        startedAt: t.startedAt,
        id: demoId(t.startedAt),
      });
      const idByExternal = new Map<string, Id>();
      for (const e of t.entries) {
        const res = insertEntry(ctx, {
          id: demoId(e.at),
          sourceId,
          importId: importIds.get(t.source) ?? null,
          externalId: e.externalId,
          threadId: thread.id,
          parentId: e.parentExternalId ? (idByExternal.get(e.parentExternalId) ?? null) : null,
          kind: e.kind,
          role: e.role,
          originalCreatedAt: e.at,
          text: e.text,
        });
        idByExternal.set(e.externalId, res.id);
        count(t.source, res.duplicate);
      }
      for (const key of t.folders) {
        addFolderMember(
          ctx,
          folderIds.get(key) as Id,
          { type: 'thread', id: thread.id },
          'user',
          t.startedAt,
        );
      }
    }

    for (const e of record.loose) {
      const res = insertEntry(ctx, {
        id: demoId(e.at),
        sourceId: sourceOf(e.source),
        importId: importIds.get(e.source) ?? null,
        externalId: e.externalId,
        kind: e.kind,
        role: e.role,
        originalCreatedAt: e.at,
        text: e.text,
      });
      count(e.source, res.duplicate);
    }

    const newNoteIds: Id[] = [];
    for (const n of record.notes) {
      const res = insertNote(ctx, {
        id: demoId(n.createdAt),
        path: n.path,
        title: n.title,
        bodyMd: n.bodyMd,
        author: 'user',
        createdAt: n.createdAt,
        isDaily: n.isDaily,
        dailyDate: n.dailyDate,
        opId,
      });
      if (!res.duplicate) newNoteIds.push(res.id);
      for (const key of n.folders) {
        addFolderMember(ctx, folderIds.get(key) as Id, { type: 'note', id: res.id }, 'user', n.createdAt);
      }
    }

    let added = 0;
    let duplicates = 0;
    for (const s of DEMO_SOURCES) {
      const st = stats.get(s.key) as ImportStats;
      added += st.added;
      duplicates += st.duplicates;
      finishImport(ctx, importIds.get(s.key) as Id, st);
      if (st.added > 0) touchSourceImport(ctx, sourceOf(s.key));
    }

    ctx.db.run('UPDATE operations SET payload = ?, inverse = ? WHERE op_id = ?', [
      JSON.stringify({
        kind: 'demo',
        label: 'Demo-Archiv',
        added,
        duplicates,
        notesAdded: newNoteIds.length,
      }),
      JSON.stringify({ importIds: [...importIds.values()], noteIds: newNoteIds, folderIds: newFolderIds }),
      opId,
    ]);

    const message =
      added === 0 && newNoteIds.length === 0
        ? `Demo-Archiv ist bereits vorhanden (${duplicates} Duplikate, 0 neu)`
        : `Demo-Archiv geladen: ${added} Einträge, ${newNoteIds.length} Notizen`;
    return { opId, undoable: true, message, added, duplicates, notesAdded: newNoteIds.length };
  });
}
