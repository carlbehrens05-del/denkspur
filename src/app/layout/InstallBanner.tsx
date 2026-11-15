import { useState } from 'react';
import { detectStandalone, isIos, isSafari } from '../../core/api/platform';
import { de } from '../i18n/de';

const KEY = 'denkspur.installBanner.dismissedAt';

function wasDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY) ?? 0);
    // Nach 7 Tagen erneut erinnern.
    return Date.now() - at < 7 * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

/** Hinweis „Zum Home-Bildschirm hinzufügen“ – nur in Safari auf iPad/iPhone, wenn nicht installiert. */
export function InstallBanner() {
  const [visible, setVisible] = useState(
    () => isIos() && isSafari() && !detectStandalone() && !wasDismissed(),
  );
  if (!visible) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // egal – dann erscheint der Hinweis beim nächsten Start wieder
    }
    setVisible(false);
  };
  return (
    <div className="banner" role="note" data-testid="install-banner">
      <p>
        <strong>{de.install.title}</strong>
        <br />
        {de.install.text}
      </p>
      <button type="button" className="btn" onClick={dismiss}>
        {de.install.dismiss}
      </button>
    </div>
  );
}
