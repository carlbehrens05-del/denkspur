import type { Author, Id, Stage } from '../model/types';
import type { Ctx } from './context';
import { indexDocument } from './search';

/**
 * Notizen – in M0 nur das Anlegen (für das Demo-Archiv).
 * Editor, Versionen bearbeiten, Tagesnotiz und Export folgen in M2.
 */
export interface InsertNoteInput {
  path: string;
  title: string;
  bodyMd: string;
  author: Author;
  createdAt: string;
  stage?: Stage;
  isDaily?: boolean;
  dailyDate?: string | null;
  opId?: Id | null;
  id?: Id;
}

/** Legt eine Notiz mit Version 1 an. Gibt die bestehende ID zurück, wenn der Pfad schon existiert. */
export function insertNote(ctx: Ctx, input: InsertNoteInput): { id: Id; duplicate: boolean } {
  const existing = ctx.db.get<{ id: string }>('SELECT id FROM notes WHERE path = ?', [input.path]);
  if (existing) return { id: existing.id, duplicate: true };
  const id = input.id ?? ctx.id(input.createdAt);
  ctx.db.run(
    `INSERT INTO notes (id, path, title, author, stage, is_daily, daily_date, current_version,
       source_entry_id, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, 0, ?, ?)`,
    [
      id,
      input.path,
      input.title,
      input.author,
      input.stage ?? 'raw',
      input.isDaily ? 1 : 0,
      input.dailyDate ?? null,
      input.createdAt,
      input.createdAt,
    ],
  );
  ctx.db.run(
    'INSERT INTO note_versions (note_id, version, body_md, created_at, actor, reason, op_id) VALUES (?, 1, ?, ?, ?, NULL, ?)',
    [id, input.bodyMd, input.createdAt, input.author, input.opId ?? null],
  );
  indexDocument(ctx, 'note', id, input.title, input.bodyMd);
  return { id, duplicate: false };
}
