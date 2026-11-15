import type { Id, Source, SourceDecision, SourceKind, WhoseWords } from '../model/types';
import { parseJson, type Ctx } from './context';

interface SourceRow {
  id: string;
  kind: SourceKind;
  label: string;
  decision: SourceDecision;
  whose_words: WhoseWords;
  settings: string;
  created_at: string;
  last_import_at: string | null;
}

export function mapSource(r: SourceRow): Source {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    decision: r.decision,
    whoseWords: r.whose_words,
    settings: parseJson<Record<string, unknown>>(r.settings, {}),
    createdAt: r.created_at,
    lastImportAt: r.last_import_at,
  };
}

export interface CreateSourceInput {
  kind: SourceKind;
  label: string;
  decision?: SourceDecision;
  whoseWords?: WhoseWords;
  settings?: Record<string, unknown>;
}

/** Legt eine Quelle an. Keine eigene Operation – läuft immer innerhalb eines Imports. */
export function createSource(ctx: Ctx, input: CreateSourceInput): Source {
  const id = ctx.id();
  ctx.db.run(
    `INSERT INTO sources (id, kind, label, decision, whose_words, settings, created_at, last_import_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      input.kind,
      input.label,
      input.decision ?? 'later',
      input.whoseWords ?? 'mine',
      JSON.stringify(input.settings ?? {}),
      ctx.now(),
    ],
  );
  const src = getSource(ctx, id);
  if (!src) throw new Error('sources: Anlegen fehlgeschlagen');
  return src;
}

export function getSource(ctx: Ctx, id: Id): Source | undefined {
  const row = ctx.db.get<SourceRow>('SELECT * FROM sources WHERE id = ?', [id]);
  return row ? mapSource(row) : undefined;
}

export function findSource(ctx: Ctx, kind: SourceKind, label: string): Source | undefined {
  const row = ctx.db.get<SourceRow>(
    'SELECT * FROM sources WHERE kind = ? AND label = ? ORDER BY id LIMIT 1',
    [kind, label],
  );
  return row ? mapSource(row) : undefined;
}

export function listSources(ctx: Ctx): Source[] {
  return ctx.db.all<SourceRow>('SELECT * FROM sources ORDER BY created_at, id').map(mapSource);
}

export function touchSourceImport(ctx: Ctx, id: Id): void {
  ctx.db.run('UPDATE sources SET last_import_at = ? WHERE id = ?', [ctx.now(), id]);
}
