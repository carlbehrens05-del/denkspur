import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { de } from '../i18n/de';
import { useUi } from '../store';

/** Meldung unten am Bildschirm, bei rückgängig machbaren Aktionen mit „Rückgängig“. */
export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const show = useUi((s) => s.showToast);
  const bump = useUi((s) => s.bump);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(hide, toast.undoOpId ? 10_000 : 5_000);
    return () => window.clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;

  const undo = async () => {
    if (!toast.undoOpId) return;
    setBusy(true);
    try {
      const res = await api().undo(toast.undoOpId);
      show(res.message);
      bump();
    } catch (err) {
      show(errorMessage(err), undefined, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={toast.tone === 'error' ? 'toast error' : 'toast'} role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.undoOpId && (
        <button type="button" className="btn btn-undo" onClick={undo} disabled={busy}>
          {de.toast.undo}
        </button>
      )}
      <button type="button" className="btn" aria-label={de.toast.close} onClick={hide}>
        ✕
      </button>
    </div>
  );
}
