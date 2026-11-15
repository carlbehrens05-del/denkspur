import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../core/util/time';
import { api, errorMessage } from '../../app/api';
import { de } from '../../app/i18n/de';
import { useUi } from '../../app/store';
import { useAsync } from '../../app/useAsync';

export function HomeView() {
  const version = useUi((s) => s.dataVersion);
  const bump = useUi((s) => s.bump);
  const showToast = useUi((s) => s.showToast);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const load = useCallback(() => api().stats(), []);
  const { data: stats, error } = useAsync(load, version);

  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      const res = await api().loadDemoRecord();
      showToast(res.message, res.undoable ? res.opId : undefined);
      bump();
    } catch (err) {
      showToast(errorMessage(err), undefined, 'error');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <section>
      <h1>{de.home.title}</h1>
      <p>{de.home.intro}</p>

      <div className="card">
        <h2>{de.home.stats}</h2>
        {error && <p role="alert">{error}</p>}
        {stats && (
          <>
            <div className="stats" data-testid="stats">
              <div className="stat">
                <b data-testid="stat-entries">{stats.entries}</b>
                {de.home.entries}
              </div>
              <div className="stat">
                <b>{stats.threads}</b>
                {de.home.threads}
              </div>
              <div className="stat">
                <b>{stats.notes}</b>
                {de.home.notes}
              </div>
              <div className="stat">
                <b>{stats.sources}</b>
                {de.home.sources}
              </div>
            </div>
            {stats.firstEntryAt && (
              <p className="small muted">
                {de.home.range}: {formatDate(stats.firstEntryAt)} – {formatDate(stats.lastEntryAt)}
              </p>
            )}
            {stats.entries === 0 && <p>{de.home.empty}</p>}
          </>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-accent" onClick={loadDemo} disabled={loadingDemo}>
            {loadingDemo ? de.home.loadingDemo : de.home.loadDemo}
          </button>
        </div>
      </div>

      {stats && stats.entries > 0 && (
        <div className="card">
          <p>{de.home.tryIt}</p>
          <div className="chips">
            {de.home.examples.map((q) => (
              <Link key={q} className="chip" to={`/suche?q=${encodeURIComponent(q)}`}>
                {q}
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="small muted">{de.home.importLater}</p>
    </section>
  );
}
