import { useEffect, useRef, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { de } from '../i18n/de';

/** Das Befehlsfeld – in M0 eine Suche. Mit Tastatur: ⌘K bzw. Strg+K. */
export function CommandBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const q = location.pathname === '/suche' ? (params.get('q') ?? '') : '';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    navigate(value ? `/suche?q=${encodeURIComponent(value)}` : '/suche');
    inputRef.current?.blur();
  };

  return (
    <form className="commandbar" role="search" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="commandbar-input">
        {de.command.label}
      </label>
      <input
        key={q}
        ref={inputRef}
        id="commandbar-input"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={de.command.placeholder}
        defaultValue={q}
      />
      <button type="submit" className="btn btn-accent">
        {de.command.submit}
      </button>
    </form>
  );
}
