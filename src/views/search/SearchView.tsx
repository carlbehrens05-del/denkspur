import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDateTime } from '../../core/util/time';
import { api } from '../../app/api';
import { de } from '../../app/i18n/de';
import { detailParam, parseDetailParam } from '../../app/layout/DetailPane';
import { useUi } from '../../app/store';
import { useAsync } from '../../app/useAsync';
import { Snippet } from './Snippet';

const PAGE = 30;

export function SearchView() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  return (
    <section>
      <h1>{de.search.title}</h1>
      {q ? <Results key={q} q={q} /> : <p className="muted">{de.search.hint}</p>}
    </section>
  );
}

function Results({ q }: { q: string }) {
  const [limit, setLimit] = useState(PAGE);
  const version = useUi((s) => s.dataVersion);
  const [params, setParams] = useSearchParams();
  const selected = parseDetailParam(params.get('d'));
  const load = useCallback(() => api().search({ text: q, limit }), [q, limit]);
  const { data, error, loading } = useAsync(load, version);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p className="muted">…</p>;

  const open = (type: string, id: string) => {
    if (type !== 'entry' && type !== 'note') return;
    const next = new URLSearchParams(params);
    next.set('d', detailParam({ type, id }));
    setParams(next);
  };

  return (
    <>
      <p className="muted" data-testid="result-count" aria-live="polite">
        {de.search.results(data.total)}
      </p>
      {data.total === 0 && <p>{de.search.none}</p>}
      <ul className="hits">
        {data.hits.map((h) => {
          const isSelected = selected?.id === h.target.id;
          return (
            <li key={`${h.target.type}:${h.target.id}`}>
              <button
                type="button"
                className="hit"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => open(h.target.type, h.target.id)}
                data-testid="hit"
              >
                <span className="hit-meta">
                  <span className="badge">{h.target.type === 'note' ? de.search.note : de.search.entry}</span>
                  <span>{formatDateTime(h.at)}</span>
                </span>
                <span className="hit-title">{h.title}</span>
                <span className="hit-snippet">
                  <Snippet html={h.snippet} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {data.hits.length < data.total && (
        <button type="button" className="btn" disabled={loading} onClick={() => setLimit((n) => n + PAGE)}>
          {de.search.showMore}
        </button>
      )}
    </>
  );
}
