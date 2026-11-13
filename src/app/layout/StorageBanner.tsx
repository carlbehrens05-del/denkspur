import { Link } from 'react-router-dom';
import { de } from '../i18n/de';
import { useUi } from '../store';

/** Deutliche Warnung, wenn nur im Arbeitsspeicher gespeichert wird. */
export function StorageBanner() {
  const warning = useUi((s) => s.storageWarning);
  if (!warning) return null;
  return (
    <div className="banner banner-danger" role="alert" data-testid="storage-warning">
      <p>
        <strong>{de.storage.memoryWarning}</strong>
        <br />
        <span className="small">{de.storage.privateHint}</span>
      </p>
      <Link className="btn" to="/diagnose">
        {de.storage.details}
      </Link>
    </div>
  );
}
