import { useCallback, useState, type FormEvent } from 'react';
import { formatDateTime } from '../../core/util/time';
import { api, errorMessage } from '../../app/api';
import { de } from '../../app/i18n/de';
import { useUi } from '../../app/store';
import { useAsync } from '../../app/useAsync';

/** Eintragsdetail: Original und aktueller Text, Versionen, Korrigieren, „Nicht von mir“. */
export function EntryDetail({ id }: { id: string }) {
  const version = useUi((s) => s.dataVersion);
  const bump = useUi((s) => s.bump);
  const showToast = useUi((s) => s.showToast);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const detail = await api().getEntry(id);
    const [sources, thread] = await Promise.all([
      api().listSources(),
      detail.entry.threadId ? api().getThread(detail.entry.threadId) : Promise.resolve(null),
    ]);
    return { ...detail, source: sources.find((s) => s.id === detail.entry.sourceId) ?? null, thread };
  }, [id]);
  const { data, error } = useAsync(load, version);

  if (error)
    return (
      <p role="alert">
        {de.entry.loadFailed} {error}
      </p>
    );
  if (!data || data.entry.id !== id) return <p className="muted">…</p>;
  const { entry, versions, source, thread } = data;
  const hidden = entry.excluded || entry.notMine || Boolean(thread?.thread.notMine);

  const run = async (action: () => Promise<{ message: string; opId: string; undoable: boolean }>) => {
    setBusy(true);
    try {
      const res = await action();
      showToast(res.message, res.undoable ? res.opId : undefined);
      bump();
      return true;
    } catch (err) {
      showToast(errorMessage(err), undefined, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveCorrection = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = String(form.get('text') ?? '');
    const reason = String(form.get('reason') ?? '').trim();
    const ok = await run(() => api().correctEntry(id, text, reason || undefined));
    if (ok) setEditing(false);
  };

  return (
    <div data-testid="entry-detail">
      <dl className="meta">
        <dt>{de.entry.date}</dt>
        <dd>{formatDateTime(entry.originalCreatedAt)}</dd>
        <dt>{de.entry.source}</dt>
        <dd>{source?.label ?? '–'}</dd>
        {thread && (
          <>
            <dt>{de.entry.thread}</dt>
            <dd>{thread.thread.title ?? '–'}</dd>
          </>
        )}
        <dt>{de.entry.role}</dt>
        <dd>
          {de.entry.roles[entry.role]} · {de.entry.kinds[entry.kind]}
        </dd>
      </dl>

      {hidden && (
        <p className="banner banner-danger" role="note">
          {de.entry.hidden}
        </p>
      )}

      {entry.isCorrected ? (
        <>
          <h3>
            {de.entry.current} <span className="badge badge-warn">{de.entry.corrected}</span>
          </h3>
          <div className="text-block" data-testid="entry-text">
            {entry.text}
          </div>
          <h3 style={{ marginTop: 16 }}>{de.entry.original}</h3>
          <div className="text-block original strike" data-testid="entry-original">
            {entry.originalText}
          </div>
        </>
      ) : (
        <div className="text-block original" data-testid="entry-text">
          {entry.text}
        </div>
      )}

      {editing ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={saveCorrection}>
          <h3>{de.entry.correctTitle}</h3>
          <p className="small muted">{de.entry.correctHint}</p>
          <label className="visually-hidden" htmlFor="correct-text">
            {de.entry.correctTitle}
          </label>
          <textarea id="correct-text" name="text" className="field" defaultValue={entry.text} required />
          <label className="small" htmlFor="correct-reason">
            {de.entry.reason}
          </label>
          <input id="correct-reason" name="reason" className="field" autoComplete="off" />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {de.entry.save}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              {de.entry.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(true)} disabled={busy}>
            {de.entry.correct}
          </button>
          {!hidden && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run(() => api().markNotMine({ type: 'entry', id }))}
            >
              {de.entry.notMineEntry}
            </button>
          )}
          {!hidden && entry.threadId && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => run(() => api().markNotMine({ type: 'thread', id: entry.threadId as string }))}
            >
              {de.entry.notMineThread}
            </button>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>{de.entry.versions}</h3>
      <ol className="versions" data-testid="versions">
        <li className={entry.currentVersion === 1 ? 'active' : undefined}>
          <span className="small">
            {de.entry.versionOriginal} · {formatDateTime(entry.originalCreatedAt)}
            {entry.currentVersion === 1 && <> · {de.entry.active}</>}
          </span>
        </li>
        {versions.map((v) => (
          <li key={v.version} className={entry.currentVersion === v.version ? 'active' : undefined}>
            <span className="small">
              {de.entry.version(v.version)} · {formatDateTime(v.createdAt)}
              {v.reason ? ` · ${v.reason}` : ''}
              {entry.currentVersion === v.version && <> · {de.entry.active}</>}
            </span>
            <div className="small muted">{v.text}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
