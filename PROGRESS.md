# Fortschritt

| Meilenstein | Status |
|---|---|
| Vorbereitung (Gliederung, Schema, Typen, API-Vertrag) | ✅ erledigt (13.11.2026) |
| M0 – Fundament und iPad-Spike | ✅ umgesetzt, Tests grün (13.11.2026) – **Abnahme auf dem echten iPad offen** |
| M1 – Import, Fäden, Suche, Ordnung ohne KI | ⏳ als Nächstes (erst nach Rückfrage) |
| M2 – Notizen | offen |
| M3 – KI-Schicht | offen |
| M4 – Ansichten | offen |
| M5 – Befehle und Archiv-Chat | offen |
| M6 – Sicherheit und Backup | offen |
| M7 – weitere Quellen | offen |
| M8 – Computer-Begleiter (optional) | offen |

## Vorbereitung – Ergebnis
- `src/core/db/migrations/0001_init.sql`: Schema mit 30 Tabellen und Views, getestet mit SQLite 3.53.1 und FTS5 (`tools/check_schema.py`).
- `src/core/model/types.ts` und `src/core/api/contract.ts`: fehlerfrei mit `tsc --strict`.

## M0 – Ergebnis

| # | Aufgabe | Stand |
|---|---|---|
| M0.1 | Projekt aufsetzen | ✅ pnpm, Vite 8 (React 19 + TS strict), ESLint 10 (flat config), Prettier, Vitest 5, Playwright (Chromium, WebKit, iPad-Emulation). Skripte `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`. |
| M0.2 | PWA | ✅ `vite-plugin-pwa` (Manifest „Denkspur“, `standalone`, Theme-Farbe), eigenes Logo `public/favicon.svg` („Spur“ aus Punkten), Icons 192/512/maskable und `apple-touch-icon` 180 (erzeugt mit `tools/render-icons.mjs`). iOS-Meta-Tags, `viewport-fit=cover`, Safe-Area-Abstände. Offline-Cache der App-Hülle inkl. WASM. Strenge CSP im Build. |
| M0.3 | DB-Worker | ✅ `@sqlite.org/sqlite-wasm` 3.54.1 im Worker mit VFS `opfs-sahpool`; ohne OPFS Fallback auf Speicher mit roter Warnung. `migrate.ts` (Migrationen per `?raw`), `sqlite.ts` (Db-Implementierung mit Savepoints), Comlink-`expose`, `client.ts`. **Spike direkt nach M0.3 (`pnpm build && pnpm preview`): Chromium → `opfs-sahpool` ✓, WebKit mit dauerhaftem Profil → `opfs-sahpool` ✓.** |
| M0.4 | Basis-Services | ✅ `util/ids.ts` (ULID, monoton, Seed), `util/hash.ts` (SHA-256 synchron + WebCrypto), `util/time.ts` (Europe/Berlin), `services/operations.ts` (Undo-Registry), `sources`, `entries` (Hash, Dedup, Suchindex, Korrektur, „nicht von mir“), `threads` (lesen, „nicht von mir“), `search` (FTS5, Präfixsuche, Snippet mit `<mark>`, HTML maskiert), `settings` (rückgängig machbar), `stats`. Spätere API-Methoden werfen `NotImplemented`. |
| M0.5 | Speicher und Installation | ✅ `navigator.storage.persist()` beim Start und per Knopf in der Diagnose, `estimate()`, Erkennung Home-Bildschirm (`navigator.standalone` / `display-mode: standalone`), Banner „Zum Home-Bildschirm hinzufügen“ in Safari auf iPad/iPhone. |
| M0.6 | Demo-Archiv | ✅ `src/demo/` deterministisch (Seed 20260301): Jonas Brandt, 01.03.–31.10.2026, 5 Quellen, 292 Einträge, 25 Fäden, 40 Notizen (davon 10 Tagesnotizen), Ordner „Facharbeit“ und „Bienen-Projekt“, Bienentränke 4× (zuerst 12.04.2026), „4.000 Wildbienen“, Maltes eingefügter Chat, Lebenslauf mit belegten und unbelegten Punkten. Laden = eine Operation `import.run` (rückgängig machbar), zweites Laden → 0 neu. |
| M0.7 | Minimal-UI | ✅ App-Shell (Seitenleiste bzw. Schublade im Hochformat, Befehlsfeld als Suche mit ⌘K, Detailbereich bzw. Sheet im Hochformat), Trefferliste, Eintragsdetail (Original/aktueller Text, Versionen, „Korrigieren“, „Diese Nachricht/Dieses Gespräch ist nicht von mir“), Toast mit „Rückgängig“, `/diagnose` mit Ampeln, „Archiv zurücksetzen“. Tippziele ≥ 44 px (per Test geprüft). |
| M0.8 | Tests | ✅ 57 Unit-Tests (Migrationen, Unveränderlichkeit, Dedup, Korrektur + Rückgängig, Suche mit Umlauten, „nicht von mir“, Einstellungen, Demo-Generator, API) gegen SQLite-WASM im Speicher unter Node. 22 E2E-Tests in Chromium, WebKit und iPad-Emulation (Demo laden, „Facharbeit“ suchen, neu laden → Daten da; „uber“ → „über“; Korrektur 4.000 → 400 und Rückgängig; „Gespräch nicht von mir“; offline öffnen bei abgeschaltetem Server; Install-Banner; Tippziele). |
| M0.9 | Deployment | ✅ `.github/workflows/ci-deploy.yml`: Tests bei jedem Push; Build und Veröffentlichung auf GitHub Pages bei Push auf `main` (Basis-Pfad `/denkspur/`, `404.html` als SPA-Fallback). Anleitung in `README.md`. |
| M0.10 | Abschluss | ✅ diese Datei, iPad-Testanleitung unten |

### Abnahme M0 (auf dem echten iPad, App vom Home-Bildschirm gestartet)

| Punkt | Automatisch geprüft | Auf dem iPad |
|---|---|---|
| Diagnose: FTS5 ✓, VFS `opfs-sahpool`, Speicher dauerhaft ✓ (oder begründet), als App gestartet ✓ | FTS5 und VFS in Chromium/WebKit ✓ | offen |
| Demo-Archiv lädt, „Facharbeit“ findet Treffer, „uber“ findet „über“ | ✓ | offen |
| Korrektur „4.000 → 400“ funktioniert und lässt sich rückgängig machen | ✓ | offen |
| App schließen und wieder öffnen: Daten sind noch da | ✓ (Neuladen) | offen |
| Im Flugmodus öffnet sich die App | ✓ (Server abgeschaltet) | offen |

### Abweichungen und Entscheidungen
- **Verbindliche Dateien unverändert:** `0001_init.sql`, `types.ts` und `contract.ts` sind byte-genau wie geliefert (von Prettier ausgenommen).
- **Db-Schnittstelle erweitert** um `exec` (Migrationen mit mehreren Anweisungen), `changes` und `close` (`src/core/db/types.ts`).
- **Vorgezogen**, weil die M0-Oberfläche sie braucht: `undo` und `listOperations` (für den Toast), `getNote` (nur lesen, für Notiz-Treffer), `getThread`, `listThreads`, `getReplies`, `listSources`.
- **Zusatzmethode außerhalb des Vertrags:** `storageWarning()` (Grund für den Speicher-Fallback, nur für das Warnbanner), Typ `DenkspurApiExtras` in `impl.ts`.
- **`diagnostics()`** wird im Haupt-Thread (`client.ts`) um `standalone`, Speicherwerte und Passkey-PRF ergänzt – diese Werte kennt nur das Fenster.
- **Suche:** Wörter ohne FTS-Syntax werden als Präfix gesucht („Bien“ → „Bienen“), Fließtext zählt doppelt so viel wie der Fadentitel. Ungültige FTS-Syntax fällt auf eine einfache Wortsuche zurück. Hinweis: „ß“ wird vom Tokenizer nicht zu „ss“ – „große“ findet „Größe“, „grosse“ nicht.
- **Rückgängig einer Korrektur** ist nur möglich, solange danach keine neuere Korrektur desselben Eintrags aktiv ist (sonst verständliche Fehlermeldung).
- **Demo-Import rückgängig** schließt die Einträge aus (`excluded = 1`), archiviert Notizen und neu angelegte Ordner – gelöscht wird nichts.
- **Tests im Browser:** Playwright-WebKit stellt OPFS nur in einem dauerhaften Profil bereit (wie Safari außerhalb des privaten Modus). Die E2E-Tests nutzen deshalb pro Test ein eigenes dauerhaftes Profil. Der Offline-Test startet einen eigenen Server und schaltet ihn wirklich ab, weil die Offline-Emulation von Playwright in WebKit auch Service-Worker-Antworten blockiert.
- **Versionen:** TypeScript 6.0 statt 7.0 (typescript-eslint unterstützt TS 7 noch nicht). `@playwright/test` auf 1.63.0 festgelegt (passt zu den vorinstallierten Browsern der Entwicklungsumgebung; Update jederzeit möglich).
- **Zusätzliche Entwicklungs-Abhängigkeiten** (nur Werkzeuge, nicht im ausgelieferten Code außer `workbox-window`): `typescript-eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks` (ESLint für TS/React), `@types/react`, `@types/react-dom`, `@types/node` (Typen), `workbox-window` (Pflicht-Begleiter von `vite-plugin-pwa` für die Service-Worker-Registrierung). **Bitte bestätigen.**
- `storage/opfs.ts` (Original-Dateien im OPFS) folgt mit dem Import in M1.

### Bekannte Einschränkungen
- `opfs-sahpool` erlaubt nur **eine** Verbindung: Ist Denkspur in einem zweiten Tab offen, arbeitet dieser im Speicher und zeigt die rote Warnung.
- Im **privaten Modus** von Safari gibt es kein OPFS → Speicher-Fallback mit Warnung.
- „Speicher dauerhaft“ gewährt Safari in der Regel nur der installierten App (vom Home-Bildschirm).

## Entscheidungen
- Hosting: **GitHub Pages** (Repository `denkspur`, URL https://carlbehrens05-del.github.io/denkspur/)
- KI-Anbieter: _offen (Standard Anthropic, eigener API-Key, erst ab M3 nötig)_
- Name: Denkspur (Arbeitstitel)

## Log
- 13.11.2026: Projekt vorbereitet.
- 13.11.2026: M0 umgesetzt: PWA, SQLite-WASM (`opfs-sahpool`) im Worker, Basis-Services mit Rückgängig, Demo-Archiv, Minimal-UI mit Diagnose, 57 Unit- und 22 E2E-Tests grün, GitHub-Pages-Workflow.
