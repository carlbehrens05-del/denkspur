import { NavLink } from 'react-router-dom';
import { de } from '../i18n/de';
import { useUi } from '../store';

export function Sidebar() {
  const open = useUi((s) => s.sidebarOpen);
  const setOpen = useUi((s) => s.setSidebarOpen);
  const close = () => setOpen(false);
  const links = [
    { to: '/', label: de.nav.start, end: true },
    { to: '/suche', label: de.nav.search, end: false },
    { to: '/diagnose', label: de.nav.diagnose, end: false },
  ];
  return (
    <>
      <div className={open ? 'backdrop open' : 'backdrop'} onClick={close} aria-hidden="true" />
      <aside className={open ? 'sidebar open' : 'sidebar'} aria-label={de.nav.label}>
        <nav>
          <ul>
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={close}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <h2>{de.nav.upcoming}</h2>
          <ul>
            {de.nav.future.map((name) => (
              <li key={name} className="nav-future">
                {name}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
