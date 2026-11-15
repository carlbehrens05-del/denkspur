import type { Author, Id, TargetRef } from '../model/types';
import type { Ctx } from './context';

/**
 * Ordner – in M0 nur das Anlegen und Zuordnen (für das Demo-Archiv).
 * Zusammenführen, Umbenennen und Rückgängig folgen in M1.
 */
export function ensureFolder(
  ctx: Ctx,
  name: string,
  createdBy: Author,
  createdAt: string,
  id?: Id,
): { id: Id; created: boolean } {
  const existing = ctx.db.get<{ id: string }>(
    "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL AND status IN ('active', 'proposed')",
    [name],
  );
  if (existing) return { id: existing.id, created: false };
  const folderId = id ?? ctx.id(createdAt);
  ctx.db.run(
    `INSERT INTO folders (id, name, parent_id, status, merged_into, is_inbox, created_by, created_at)
     VALUES (?, ?, NULL, 'active', NULL, 0, ?, ?)`,
    [folderId, name, createdBy, createdAt],
  );
  return { id: folderId, created: true };
}

export function addFolderMember(
  ctx: Ctx,
  folderId: Id,
  target: TargetRef,
  createdBy: Author,
  createdAt: string,
): void {
  ctx.db.run(
    `INSERT OR IGNORE INTO folder_members (folder_id, target_type, target_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [folderId, target.type, target.id, createdBy, createdAt],
  );
}
