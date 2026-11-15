import { useCallback } from 'react';
import { formatDateTime } from '../../core/util/time';
import { api } from '../../app/api';
import { de } from '../../app/i18n/de';
import { useUi } from '../../app/store';
import { useAsync } from '../../app/useAsync';

/** Schlichte Notizansicht (nur lesen). Der Editor folgt in M2. */
export function NoteDetail({ id }: { id: string }) {
  const version = useUi((s) => s.dataVersion);
  const load = useCallback(() => api().getNote(id), [id]);
  const { data, error } = useAsync(load, version);
  if (error) return <p role="alert">{error}</p>;
  if (!data || data.note.id !== id) return <p className="muted">…</p>;
  const { note } = data;
  return (
    <div data-testid="note-detail">
      <h3>{note.title}</h3>
      <dl className="meta">
        <dt>{de.note.path}</dt>
        <dd>{note.path}</dd>
        <dt>{de.note.created}</dt>
        <dd>{formatDateTime(note.createdAt)}</dd>
      </dl>
      <div className="text-block">{note.bodyMd}</div>
      <p className="small muted">{de.note.editorLater}</p>
    </div>
  );
}
