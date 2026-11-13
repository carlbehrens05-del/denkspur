import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { requestPersistence } from '../core/api/platform';
import { api, errorMessage } from './api';
import { de } from './i18n/de';
import { CommandBar } from './layout/CommandBar';
import { DetailPane, parseDetailParam } from './layout/DetailPane';
import { InstallBanner } from './layout/InstallBanner';
import { Sidebar } from './layout/Sidebar';
import { StorageBanner } from './layout/StorageBanner';
import { ToastHost } from './layout/Toast';
import { AppRoutes } from './routes';
import { useUi } from './store';

type Boot = { state: 'opening' } | { state: 'ready' } | { state: 'error'; message: string };

export function App() {
  const [boot, setBoot] = useState<Boot>({ state: 'opening' });
  const [attempt, setAttempt] = useState(0);
  const setStorageWarning = useUi((s) => s.setStorageWarning);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);
  const [params] = useSearchParams();
  const detail = parseDetailParam(params.get('d'));

  useEffect(() => {
    let alive = true;
    api()
      .init()
      .then(() => api().storageWarning())
      .then((warning) => {
        if (!alive) return;
        setStorageWarning(warning);
        setBoot({ state: 'ready' });
        // Speicher dauerhaft anfordern (Safari gewährt das vor allem installierten Apps).
        void requestPersistence();
      })
      .catch((err: unknown) => alive && setBoot({ state: 'error', message: errorMessage(err) }));
    return () => {
      alive = false;
    };
  }, [attempt, setStorageWarning]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <div className={detail ? 'shell with-detail' : 'shell'}>
      <header className="topbar">
        <button
          type="button"
          className="btn btn-ghost menu-btn"
          aria-label={de.nav.menu}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <a className="brand" href={import.meta.env.BASE_URL}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <span>{de.app.name}</span>
        </a>
        <CommandBar />
      </header>
      <div className="banners">
        <StorageBanner />
        <InstallBanner />
      </div>
      <Sidebar />
      <main className="main" id="main">
        {boot.state === 'opening' && <p className="muted">{de.app.opening}</p>}
        {boot.state === 'error' && (
          <div className="card" role="alert">
            <p>{de.app.openFailed}</p>
            <p className="small muted">{boot.message}</p>
            <button type="button" className="btn" onClick={retry}>
              {de.app.retry}
            </button>
          </div>
        )}
        {boot.state === 'ready' && <AppRoutes />}
      </main>
      {boot.state === 'ready' && detail && <DetailPane target={detail} />}
      <ToastHost />
    </div>
  );
}
