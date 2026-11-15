import { useSearchParams } from 'react-router-dom';
import type { TargetRef } from '../../core/model/types';
import { EntryDetail } from '../../views/entry/EntryDetail';
import { NoteDetail } from '../../views/entry/NoteDetail';
import { de } from '../i18n/de';

/** URL-Parameter d=entry:ID bzw. d=note:ID → Ziel. */
export function parseDetailParam(value: string | null): TargetRef | null {
  if (!value) return null;
  const [type, id] = value.split(':');
  if (!id || (type !== 'entry' && type !== 'note' && type !== 'thread')) return null;
  return { type, id };
}

export function detailParam(target: TargetRef): string {
  return `${target.type}:${target.id}`;
}

/** Detailbereich rechts (Querformat) bzw. als Sheet von unten (Hochformat). */
export function DetailPane({ target }: { target: TargetRef }) {
  const [params, setParams] = useSearchParams();
  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('d');
    setParams(next);
  };
  return (
    <aside className="detail" aria-label={de.entry.detail} data-testid="detail">
      <div className="detail-head">
        <h2 className="visually-hidden">{de.entry.detail}</h2>
        <span className="badge">{target.type === 'note' ? de.search.note : de.search.entry}</span>
        <button type="button" className="btn btn-ghost" aria-label={de.entry.closeDetail} onClick={close}>
          ✕
        </button>
      </div>
      {target.type === 'note' ? <NoteDetail id={target.id} /> : <EntryDetail id={target.id} />}
    </aside>
  );
}
