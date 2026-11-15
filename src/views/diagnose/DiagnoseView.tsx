import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import type { Diagnostics } from '../../core/api/contract';
import { requestPersistence } from '../../core/api/platform';
import { api, errorMessage } from '../../app/api';
import { de } from '../../app/i18n/de';
import { useUi } from '../../app/store';
import { useAsync } from '../../app/useAsync';

type Lamp = 'ok' | 'warn' | 'bad' | 'info';

function formatBytes(n: number | null): string {
  if (n === null) return de.diagnose.unknown;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

interface Row {
  key: string;
  lamp: Lamp;
  label: string;
  value: ReactNode;
}

function rows(d: Diagnostics, swActive: boolean, online: boolean): Row[] {
  const t = de.diagnose;
  return [
    {
      key: 'vfs',
      lamp: d.vfs === 'opfs-sahpool' ? 'ok' : 'bad',
      label: t.vfs,
      value: d.vfs === 'opfs-sahpool' ? t.vfsGood : `${d.vfs} – ${t.vfsBad}`,
    },
    { key: 'fts5', lamp: d.fts5 ? 'ok' : 'bad', label: t.fts5, value: d.fts5 ? t.yes : t.no },
    {
      key: 'persisted',
      lamp: d.persisted ? 'ok' : 'warn',
      label: t.persisted,
      value: d.persisted ? t.persistedYes : t.persistedNo,
    },
    {
      key: 'standalone',
      lamp: d.standalone ? 'ok' : 'warn',
      label: t.standalone,
      value: d.standalone ? t.standaloneYes : t.standaloneNo,
    },
    { key: 'sw', lamp: swActive ? 'ok' : 'warn', label: t.sw, value: swActive ? t.swReady : t.swMissing },
    { key: 'online', lamp: 'info', label: t.offline, value: online ? t.online : t.offlineNow },
    {
      key: 'usage',
      lamp: 'info',
      label: t.usage,
      value: `${formatBytes(d.usageBytes)} von ${formatBytes(d.quotaBytes)}`,
    },
    { key: 'sqlite', lamp: 'info', label: t.sqlite, value: d.sqliteVersion },
    {
      key: 'schema',
      lamp: d.schemaVersion > 0 ? 'ok' : 'bad',
      label: t.schema,
      value: `Version ${d.schemaVersion}`,
    },
    { key: 'webgpu', lamp: 'info', label: t.webgpu, value: d.webgpu ? t.yes : t.no },
    {
      key: 'prf',
      lamp: 'info',
      label: t.passkeyPrf,
      value: d.passkeyPrf === 'unknown' ? t.unknown : d.passkeyPrf ? t.yes : t.no,
    },
    { key: 'ua', lamp: 'info', label: t.ua, value: <span className="small">{d.userAgent}</span> },
  ];
}

export function DiagnoseView() {
  const [refresh, setRefresh] = useState(0);
  const version = useUi((s) => s.dataVersion);
  const bump = useUi((s) => s.bump);
  const showToast = useUi((s) => s.showToast);
  const load = useCallback(() => api().diagnostics(), []);
  const { data, error } = useAsync(load, version * 1000 + refresh);
  const swActive = typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller);
  const online = typeof navigator === 'undefined' || navigator.onLine;

  const persist = async () => {
    await requestPersistence();
    setRefresh((n) => n + 1);
  };

  const reset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const value = String(new FormData(form).get('confirm') ?? '');
    try {
      await api().resetRecord(value as 'ALLES LOESCHEN');
      form.reset();
      showToast(de.diagnose.resetDone);
      bump();
    } catch (err) {
      showToast(errorMessage(err), undefined, 'error');
    }
  };

  return (
    <section>
      <h1>{de.diagnose.title}</h1>
      <p className="muted">{de.diagnose.intro}</p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <ul className="diag card" data-testid="diagnostics">
          {rows(data, swActive, online).map((r) => (
            <li key={r.key} data-testid={`diag-${r.key}`} data-lamp={r.lamp}>
              <span className={`lamp ${r.lamp}`} aria-label={r.lamp} />
              <span>{r.label}</span>
              <span className="value">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => setRefresh((n) => n + 1)}>
          {de.diagnose.refresh}
        </button>
        {data && !data.persisted && (
          <button type="button" className="btn" onClick={persist}>
            {de.diagnose.persistRequest}
          </button>
        )}
      </div>

      <form className="card" style={{ marginTop: 32 }} onSubmit={reset}>
        <h2>{de.diagnose.danger}</h2>
        <p className="small">{de.diagnose.dangerText}</p>
        <label className="visually-hidden" htmlFor="reset-confirm">
          {de.diagnose.danger}
        </label>
        <input
          id="reset-confirm"
          name="confirm"
          className="field"
          autoComplete="off"
          placeholder="ALLES LOESCHEN"
        />
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-danger">
            {de.diagnose.dangerButton}
          </button>
        </div>
      </form>
    </section>
  );
}
