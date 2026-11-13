# CLAUDE.md – Arbeitsregeln für Denkspur

Denkspur ist eine local-first PWA (Hauptgerät: iPad/Safari), die aus KI-Chats, Notizen und Sprachmemos ein datiertes, selbstordnendes Gedankenarchiv baut. Alle Daten bleiben im Browser (SQLite-WASM über OPFS). Es gibt kein Backend.

## Zuerst lesen
1. `docs/GLIEDERUNG.md`: Architektur, Repo-Struktur, Meilensteine mit Abnahme (**verbindlich**)
2. `PROGRESS.md`: aktueller Stand
3. `docs/BAU-PROMPT.md`: Gesamtspezifikation
4. Verbindliche Verträge: `src/core/db/migrations/0001_init.sql`, `src/core/model/types.ts`, `src/core/api/contract.ts`. Änderungen daran nur begründet und in `PROGRESS.md` vermerkt. Das Schema ändert sich nur über neue Migrationen (`0002_…sql`), nie durch Bearbeiten von `0001`.

## Nicht verhandelbar
- **Originale sind unveränderlich.** Einträge werden nur angehängt, Korrekturen sind neue Versionen. Die Trigger nie entfernen oder umgehen.
- **Abgeleitetes ist getrennt** (`derived`, `taggings`, `links`) und hat immer `provenance` bzw. `run_id`.
- **Jede Schreibaktion erzeugt in derselben Transaktion eine Operation** mit Inverse, damit Rückgängig funktioniert.
- **Eine API für alles:** UI, Befehle, Chat, Agenten und Importer nutzen `DenkspurApi`. Die UI enthält kein SQL.
- **Netzwerk** nur in `src/agents/llm/*` und `src/security/timestamps.ts`, und nur nach Zustimmung (`consents`) und Datenschutzfilter. Keine Telemetrie, keine Analytics, keine Fremdskripte.
- **API-Keys verlassen nie den DB-Worker.**
- **Funktioniert ohne KI und offline.**

## Code-Konventionen
- TypeScript `strict`, kein `any`, keine `// @ts-ignore`
- `src/core`, `src/importers`, `src/agents` und `src/commands` importieren kein React.
- Zeitpunkte als ISO-8601-UTC-Strings, Anzeige in `Europe/Berlin`. IDs über `src/core/util/ids.ts` (zeitlich sortierbar).
- UI-Texte nur in `src/app/i18n/de.ts` (Deutsch)
- Inhalte aus dem Record nie per `console.log` ausgeben (auch nicht im Fehlerfall). Nur IDs und Zähler loggen.
- Touch first: Tippziele mindestens 44 px, keine Hover-only-Funktionen, Safe-Area beachten.
- Kleine, fokussierte Commits mit Nachrichten auf Deutsch.

## Befehle (ab M0)
```
pnpm dev        # Entwicklungsserver
pnpm build      # Produktions-Build
pnpm preview    # Build lokal ansehen
pnpm test       # Unit-Tests (Vitest)
pnpm test:e2e   # Playwright (Chromium + WebKit)
pnpm lint
python3 tools/check_schema.py src/core/db/migrations/0001_init.sql   # Schema-Schnelltest
```

## Arbeitsweise
- Immer nur einen Meilenstein bearbeiten. Aufgaben in der Reihenfolge aus `docs/GLIEDERUNG.md` abarbeiten.
- Zu jeder Funktion Tests schreiben. Ein Meilenstein ist erst fertig, wenn seine Abnahmekriterien erfüllt sind.
- Nach jeder Aufgabe `PROGRESS.md` aktualisieren (erledigt, offen, Abweichungen, Entscheidungen).
- Neue Abhängigkeiten außerhalb der Liste in `GLIEDERUNG.md` Abschnitt 9 vorher mit mir absprechen.
- Am Ende eines Meilensteins: kurz auf Deutsch zusammenfassen, was neu ist, wie ich es starte und wie ich es auf dem iPad teste. **Dann fragen, bevor der nächste Meilenstein beginnt.**
