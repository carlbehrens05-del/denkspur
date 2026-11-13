import type { Id } from '../model/types';
import type { Ctx } from './context';
import type { UndoHandler } from './operations';

export interface ImportStats {
  added: number;
  duplicates: number;
  skipped: number;
  errors: number;
}

export function startImport(ctx: Ctx, sourceId: Id, opId: Id, blobSha: string | null = null): Id {
  const id = ctx.id();
  ctx.db.run(
    `INSERT INTO imports (id, source_id, blob_sha, op_id, started_at, finished_at, status, stats)
     VALUES (?, ?, ?, ?, ?, NULL, 'running', '{}')`,
    [id, sourceId, blobSha, opId, ctx.now()],
  );
  return id;
}

export function finishImport(
  ctx: Ctx,
  importId: Id,
  stats: ImportStats,
  status: 'done' | 'failed' = 'done',
): void {
  ctx.db.run('UPDATE imports SET finished_at = ?, status = ?, stats = ? WHERE id = ?', [
    ctx.now(),
    status,
    JSON.stringify(stats),
    importId,
  ]);
}

/**
 * Inverse von import.run: alle Einträge der Importe werden ausgeschlossen
 * (nicht gelöscht – Originale bleiben erhalten), mitimportierte Notizen archiviert
 * und neu angelegte Ordner archiviert.
 */
export const importRunUndo: UndoHandler = {
  label: 'Import',
  apply(ctx, inverse) {
    const importIds = Array.isArray(inverse.importIds) ? inverse.importIds.map(String) : [];
    for (const importId of importIds) {
      ctx.db.run('UPDATE entries SET excluded = 1 WHERE import_id = ?', [importId]);
    }
    const noteIds = Array.isArray(inverse.noteIds) ? inverse.noteIds.map(String) : [];
    for (const noteId of noteIds) {
      ctx.db.run('UPDATE notes SET archived = 1 WHERE id = ?', [noteId]);
    }
    const folderIds = Array.isArray(inverse.folderIds) ? inverse.folderIds.map(String) : [];
    for (const folderId of folderIds) {
      ctx.db.run("UPDATE folders SET status = 'archived' WHERE id = ?", [folderId]);
    }
  },
};
