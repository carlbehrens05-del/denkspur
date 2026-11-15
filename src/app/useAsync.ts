import { useEffect, useState } from 'react';
import { errorMessage } from './api';

interface AsyncState<T> {
  source: unknown;
  data: T | undefined;
  error: string | null;
}

/**
 * Lädt Daten asynchron. `fn` muss stabil sein (useCallback); ändert sich `fn`
 * oder `version`, wird neu geladen. Bis dahin bleiben die alten Daten sichtbar.
 */
export function useAsync<T>(fn: () => Promise<T>, version = 0) {
  const [state, setState] = useState<AsyncState<T>>({ source: null, data: undefined, error: null });
  useEffect(() => {
    let alive = true;
    const source = { fn, version };
    fn().then(
      (data) => alive && setState({ source, data, error: null }),
      (err: unknown) => alive && setState({ source, data: undefined, error: errorMessage(err) }),
    );
    return () => {
      alive = false;
    };
  }, [fn, version]);
  const current = state.source as { fn: unknown; version: number } | null;
  const loading = !current || current.fn !== fn || current.version !== version;
  return { data: state.data, error: state.error, loading };
}
