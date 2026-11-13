# Denkspur – Gliederung und Bauplan

Stand: 13.11.2026. Verbindliche Grundlage für alle Code-Prompts. Was hier steht, gilt vor dem allgemeinen Bau-Prompt (`docs/BAU-PROMPT.md`). Bei Widersprüchen erst fragen, dann bauen.

---

## 1. Überblick

Denkspur ist eine **local-first Progressive Web App**. Hauptgerät ist ein iPad mit Safari (installiert über den Home-Bildschirm), die App läuft aber in jedem modernen Browser.

- Aus KI-Chat-Exporten, Notizen und Sprachmemos entsteht ein datiertes Gedankenarchiv (der „Record“), das KI-Agenten ordnen.
- Alle Daten bleiben im Browser-Speicher (SQLite-WASM über OPFS).
- Es gibt kein Backend. Der Host liefert nur statische Dateien aus.
- KI-Aufrufe gehen nur nach Zustimmung und nach dem Datenschutzfilter direkt an den gewählten Anbieter.

**Bereits vorbereitet und geprüft:**

| Datei | Inhalt | Prüfung |
|---|---|---|
| `src/core/db/migrations/0001_init.sql` | vollständiges Datenbankschema | mit SQLite 3.53 + FTS5 getestet, siehe `tools/check_schema.py` |
| `src/core/model/types.ts` | Kerntypen | `tsc --strict` fehlerfrei |
| `src/core/api/contract.ts` | Vertrag der internen API (`DenkspurApi`) | `tsc --strict` fehlerfrei |

---

## 2. Architektur

```
┌──────────────── Haupt-Thread (React) ────────────────┐
│  Ansichten  ·  Befehlsfeld  ·  Archiv-Chat            │
│  UI-Store (zustand): Ansicht, Zeitraum, Auswahl       │
│  führt UiActions aus (openView, setTimeRange, …)      │
└───────────────────────┬──────────────────────────────┘
                        │ Comlink (DenkspurApi)
┌───────────────────────┴──────── DB-Worker ───────────┐
│  API-Implementierung → services/                      │
│  importers/  ·  agents/ (Job-Runner, LLM-Adapter,     │
│  Datenschutzfilter, Budget)  ·  commands/ (Router)    │
│  SQLite-WASM (VFS opfs-sahpool)  ·  OPFS: Originale   │
└───────────┬───────────────────────────┬──────────────┘
            │ postMessage               │ fetch – nur nach Zustimmung
┌───────────┴─────────── Compute-Worker ┐   KI-Anbieter
│ lokale Embeddings, Gehirn-Layout,     │   (Anthropic / OpenAI / Google)
│ optional WebLLM                       │
└───────────────────────────────────────┘
```

**Kernentscheidungen**
1. **Eine API für alles.** `DenkspurApi` (`contract.ts`) ist die einzige Tür zu den Daten. UI, Befehle, Chat, Agenten und Importer nutzen sie.
2. **API-Keys verlassen nie den DB-Worker.** LLM-Aufrufe, Tool-Calling und Datenschutzfilter laufen dort.
3. **Eine Operation pro Schreibaktion.** Jede Schreibaktion schreibt in derselben Transaktion eine Zeile in `operations` mit Inverse. Rückgängig führt die Inverse über registrierte Handler aus und erzeugt selbst eine Operation mit `undo_of`.
4. **Originale sind unveränderlich.** Datenbank-Trigger verhindern Änderungen und Löschungen. Korrekturen werden zu `entry_versions`.
5. **Volltextsuche** über die FTS5-Tabelle `search_index`, gepflegt vom Service-Code (Löschen und neu Einfügen bei jeder neuen Version).
6. **Rechenintensives** (Embeddings lokal, 3D-Layout, WebLLM) läuft im Compute-Worker, damit die DB nie blockiert.
7. **Hintergrundarbeit** läuft nur, solange die App offen ist (iPad-Einschränkung). Jobs sichern ihren Fortschritt (`jobs.cursor`) und laufen nach dem Öffnen weiter.

**Datenbank-Abstraktion** (macht die Services testbar mit SQLite-WASM im Browser und unter Node):

```ts
interface Db {
  run(sql: string, params?: unknown[]): void;
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
  tx<T>(fn: () => T): T;
}
```

---

## 3. Repo-Struktur

```
denkspur/
  CLAUDE.md                 Arbeitsregeln für Claude Code
  PROGRESS.md               Fortschritt je Meilenstein
  README.md                 Start, Deployment, iPad-Test
  docs/
    GLIEDERUNG.md           dieses Dokument
    BAU-PROMPT.md           Gesamtspezifikation
    NAECHSTER-PROMPT.md     Prompt für den nächsten Schritt
  tools/check_schema.py     Schnelltest des SQL-Schemas
  index.html
  public/                   Icons (eigenes Logo), apple-touch-icon
  src/
    main.tsx
    app/                    App-Shell
      App.tsx, routes.tsx
      layout/               Sidebar, CommandBar, DetailPane, TimeRangeBar, InstallBanner
      store.ts              UI-Store (zustand)
      theme/                themes.ts (6 Designs), palettes.ts (7 Paletten), tokens.css
      i18n/de.ts            alle UI-Texte (Deutsch)
    core/
      model/types.ts        ✔ vorbereitet
      api/contract.ts       ✔ vorbereitet
      api/client.ts         Comlink-Proxy im Haupt-Thread
      api/impl.ts           Implementierung (im Worker)
      db/worker.ts          Worker-Einstieg: SQLite öffnen, Migrationen, expose(api)
      db/sqlite.ts          Db-Implementierung für sqlite-wasm
      db/migrate.ts         Migrations-Runner (meta.schema_version)
      db/migrations/0001_init.sql  ✔ vorbereitet
      services/             sources, entries, threads, notes, folders, tags, links,
                            exclusions, search, operations (undo), settings, stats, consents
      storage/opfs.ts       Originale (Blobs) im OPFS ablegen und lesen
      util/                 ids.ts (zeitlich sortierbare IDs), hash.ts (SHA-256), time.ts
    importers/
      types.ts              Importer-Interface, ParsedItem
      detect.ts             automatische Erkennung
      zip.ts                ZIP entpacken (fflate)
      chatgpt.ts  claude.ts  markdown.ts  gemini.ts  voice.ts  paste.ts
    agents/
      runner.ts             Job-Queue, fortsetzbar
      llm/                  adapter.ts, anthropic.ts, openai.ts, google.ts, webllm.ts, none.ts
      privacy/redact.ts     Datenschutzfilter
      budget.ts             Verbrauch, Monatslimit
      estimate.ts           Token- und Kostenschätzung
      tasks/                tagging, summarize, embed, link, folders, stages, notesRefresh, resumeCheck
    commands/
      tools.ts              Tool-Definitionen (→ DenkspurApi + UiAction)
      router.ts             mit KI (Tool-Calling)
      rules.ts              ohne KI (Regeln/Muster)
    compute/worker.ts       Embeddings lokal, Gehirn-Layout
    views/
      brain/  timeline/  notes/  threads/  table/  waves/
      chat/   agentlog/  sources/  settings/  diagnose/  search/  entry/
    security/               crypto.ts, passkey.ts, mnemonic.ts, lock.ts, backup.ts, timestamps.ts
    capture/                Schnellerfassung, Route /capture?text=
    demo/generator.ts       erfundenes Demo-Archiv (deterministisch)
  tests/
    unit/                   Vitest (Services gegen SQLite im Speicher)
    e2e/                    Playwright (Chromium + WebKit)
    fixtures/               Beispiel-Exporte (erfunden)
```

---

## 4. Module und Zuständigkeiten

| Modul | Aufgabe | ab |
|---|---|---|
| `core/db` | SQLite-WASM im Worker, OPFS, Migrationen | M0 |
| `core/services` | Geschäftslogik, jede Schreibaktion mit Operation | M0–M3 |
| `core/api` | Vertrag, Implementierung, Comlink-Client | M0 |
| `importers` | Exporte lesen → `ParsedItem` → Ingest-Pipeline | M1, M7 |
| `app` | Shell, Navigation, Befehlsfeld, Detailbereich, Designs | M0, M4 |
| `views` | Gehirn, Zeitleiste, Notizen, Fäden, Tabellen, Themenverlauf, Chat, Protokoll | M0–M5 |
| `agents` | LLM-Adapter, Datenschutzfilter, Budget, Jobs, Aufgaben | M3 |
| `commands` | natürliche Sprache → Tools | M5 |
| `compute` | Embeddings lokal, 3D-Layout | M3, M4 |
| `security` | Passkey/Passphrase, Verschlüsselung, Backup, Zeitstempel | M6 |
| `demo` | Testdaten | M0 |

---

## 5. Datenmodell – Kernregeln

Vollständiges Schema: `src/core/db/migrations/0001_init.sql`.

- **`entries`:** Originale. `original_text` ist per Trigger unveränderlich, Löschen ist blockiert.
  - `content_hash = sha256(kind|role|original_created_at|original_text)` ist eindeutig und dient der Duplikaterkennung.
  - Angezeigt wird immer `entries_current.text`, für Ansichten gilt `entries_visible`.
- **`entry_versions`:** Korrekturen ab Version 2. `entries.current_version` zeigt auf die aktive Version, Rückgängig setzt sie zurück.
- **`entries_visible`:** blendet aus, was ausgeschlossen ist, „nicht von mir“ stammt oder aus einer Quelle kommt, die nicht übernommen wurde.
- **`notes` / `note_versions`:** Markdown, jede Speicherung ist eine neue Version. Agenten-Notizen liegen unter `_agent/`, Tagesnotizen haben `is_daily=1` und `daily_date`.
- **`derived`:** alles von Agenten Erzeugte, mit Pflichtfeld `provenance` (Entry-IDs) und Status `proposed` → `accepted`/`rejected`.
- **`folders.merged_into`:** Zusammenführen ohne Neuablage. Ansichten lösen die Mitgliedschaft über `merged_into` auf.
- **`operations`:** Grundlage für Rückgängig. Jede Operation hat `type`, `payload` und `inverse`.
- **`search_index`:** FTS5 mit `remove_diacritics 2`, damit „uber“ auch „über“ findet.
- **Zurücksetzen:** `resetRecord` löscht die ganze Datenbankdatei im OPFS und legt sie neu an. Einzelne Einträge werden wegen der Trigger nicht gelöscht.

---

## 6. Wichtige Abläufe

**Import**

1. Datei wählen und Typ erkennen (`detect.ts`), bei ZIP entpacken.
2. Quelle anlegen oder wiederverwenden. Ich entscheide: Übernehmen, Ausschließen oder Später, und wessen Worte es sind.
3. Original-Datei im OPFS ablegen (`blobs`, SHA-256).
4. Der Importer liefert `ParsedItem`s (Faden, Eintrag, Eltern-ID, Rolle, Zeitpunkt, Text).
5. Für jedes Item: Ausschlussregeln prüfen, Hash berechnen, Eintrag einfügen oder als Duplikat zählen, Suchindex aktualisieren.
6. Am Ende entsteht eine einzige Operation `import.run`. Deren Inverse markiert alle Einträge dieses Imports als ausgeschlossen.

**Korrektur** („es muss 400 heißen“)

`correctEntry` legt eine neue `entry_versions`-Zeile an, setzt `current_version` hoch, aktualisiert den Suchindex und speichert eine Operation `entry.correct` (Inverse: alte Versionsnummer). Die Oberfläche zeigt einen Toast mit „Rückgängig“.

**Agentenlauf**

1. `estimateRun` berechnet Umfang, Tokens und Kosten.
2. Die Oberfläche zeigt die Schätzung, ich bestätige (`confirmRun`).
3. Der Runner verarbeitet kleine Stapel und speichert nach jedem Stapel den `cursor`.
4. Pro Aufruf: Datenschutzfilter, Budget prüfen, Aufruf protokollieren (`llm_calls`).
5. Das Ergebnis landet als `derived` mit `provenance` bzw. als `taggings` mit `run_id`.

**Befehl**

1. Das Befehlsfeld ruft `api.command(input, context)` auf.
2. Mit KI wählt das Modell per Tool-Calling aus `commands/tools.ts`, ohne KI greifen Regeln.
3. Lesende Tools laufen sofort. Schreibende Tools und Datenversand liefern `needsConfirmation`, ich bestätige, dann folgt ein erneuter Aufruf mit `confirmToken`.
4. Das Ergebnis enthält `reply`, `uiActions`, `ops` und `citations`. Die Oberfläche führt die `uiActions` aus.

---

## 7. Meilensteine und Aufgaben

Jeder Meilenstein endet mit grünen Tests, aktualisierter `PROGRESS.md`, einem Deployment und einer kurzen Anleitung zum Testen auf dem iPad. **Vor dem nächsten Meilenstein fragen.**

### M0 – Fundament und iPad-Spike (detailliert)

| # | Aufgabe | Details |
|---|---|---|
| M0.1 | Projekt aufsetzen | pnpm, Vite (React + TypeScript strict), ESLint, Prettier, Vitest, Playwright (Chromium + WebKit), `git init`, `.gitignore`. Vorhandene Dateien (`CLAUDE.md`, `docs/`, `src/core/…`, `tools/`) behalten. Skripte: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`. |
| M0.2 | PWA | `vite-plugin-pwa`: Manifest (Name „Denkspur“, `display: standalone`, Theme-Farbe), eigenes schlichtes Logo als SVG, daraus Icons 192/512 und `apple-touch-icon` 180. iOS-Meta-Tags, `viewport-fit=cover`, Safe-Area-Abstände. Offline-Cache für die App-Hülle. |
| M0.3 | DB-Worker | `@sqlite.org/sqlite-wasm` im Worker mit VFS `opfs-sahpool` (läuft in Safari ohne COOP/COEP). Ist OPFS nicht verfügbar, Fallback auf den Speicher mit deutlicher Warnung. `migrate.ts` liest die Migrationen per `?raw` ein. `Db`-Implementierung, Comlink-`expose`, `client.ts`. |
| M0.4 | Basis-Services | `util/ids.ts`, `util/hash.ts`, `services/operations.ts` (Undo-Registry) sowie: `sources.create`, `entries.insert` (Hash, Dedup, Suchindex), `entries.get/list`, `threads.get`, `entries.correct`, `threads.markNotMine` (beide rückgängig machbar), `search` (FTS5 mit Snippet), `settings`, `stats`. API-Methoden späterer Meilensteine werfen `NotImplemented`. |
| M0.5 | Speicher und Installation | `navigator.storage.persist()` und `estimate()`. Erkennen, ob die App vom Home-Bildschirm läuft (`navigator.standalone` bzw. `display-mode: standalone`). Banner „Zum Home-Bildschirm hinzufügen“ in Safari, wenn sie nicht installiert ist. |
| M0.6 | Demo-Archiv | `demo/generator.ts` nach Abschnitt 8, deterministisch (Seed). Knopf „Demo-Archiv laden“. |
| M0.7 | Minimal-UI | App-Shell (Seitenleiste, Befehlsfeld als Suche, Detailbereich), Trefferliste, Eintragsdetail (Original und aktueller Text, Versionen, Knopf „Korrigieren“, „Nicht von mir“), Toast mit „Rückgängig“, Diagnose-Seite `/diagnose` (zeigt `api.diagnostics()` mit Ampeln). Touch-tauglich. |
| M0.8 | Tests | Unit: Migrationen, Unveränderlichkeit, Dedup, Korrektur und Rückgängig, Suche mit Umlauten. Läuft gegen SQLite-WASM im Speicher unter Node. Klappt das nicht, nur in Tests `better-sqlite3` mit demselben SQL. E2E (WebKit): Demo laden, „Facharbeit“ suchen, Seite neu laden, Daten sind noch da. |
| M0.9 | Deployment | GitHub Actions → GitHub Pages (Base-Pfad beachten) **oder** Cloudflare Pages, je nach meiner Wahl. Anleitung in `README.md`. |
| M0.10 | Abschluss | `PROGRESS.md` aktualisieren, iPad-Testanleitung auf Deutsch. |

**Abnahme M0 (auf dem echten iPad, App vom Home-Bildschirm gestartet):**
- Diagnose: FTS5 ✓, VFS `opfs-sahpool`, Speicher dauerhaft ✓ (oder begründet), als App gestartet ✓
- Das Demo-Archiv lädt, die Suche „Facharbeit“ findet Treffer, „uber“ findet „über“.
- Die Korrektur „4.000 → 400“ funktioniert und lässt sich rückgängig machen.
- App schließen und wieder öffnen: Die Daten sind noch da.
- Im Flugmodus öffnet sich die App.

### M1 – Import, Fäden, Suche, Ordnung ohne KI
- Importer-Interface, `detect.ts`, `zip.ts`, ChatGPT- und Claude-Export, Markdown/Vault-ZIP, Text einfügen
  - Die Parser sind tolerant gegenüber Formatänderungen und haben Fixtures in `tests/fixtures/`.
  - Die echten Exportformate prüfe ich mit einem eigenen Export.
- Quellen-Hub (Übernehmen, Ausschließen, Später, wessen Worte), Importbericht
- Faden-Leser (vollständig, Antworten auf eine Nachricht), Eintragsliste mit Filtern, globaler Zeitraum
- Ordner (anlegen, zuordnen, zusammenführen, rückgängig), Tags/Labels von Hand, Ausschlussregeln
- `ask` ohne KI (Treffer und frühester Treffer), `firstMention`, Liste der Operationen und Rückgängig
- **Abnahme:** echter ChatGPT- und Claude-Export importiert, ein zweiter Import erzeugt nur Duplikate (0 neu). Die Befehle „Diese beiden Ordner sind dasselbe Projekt“, „Dieses Gespräch ist nicht von mir“ und „Halte meine Nachrichten aus [Quelle] raus“ lassen sich über die Oberfläche ausführen.

### M2 – Notizen
- Markdown-Editor (CodeMirror 6, touchtauglich) mit `[[`-Autovervollständigung, Backlinks, Versionen
- Tagesnotiz, „+“-Schnellerfassung, Route `/capture?text=` (für die Kurzbefehle-App)
- Obsidian-Export als ZIP und Re-Import (Änderungen erkennen), getrennter Bereich `_agent/`
- **Abnahme:** Notiz mit `[[Link]]` angelegt, als ZIP exportiert, in Obsidian geöffnet, Links funktionieren.

### M3 – KI-Schicht
- LLM-Adapter (Anthropic, OpenAI, Google, WebLLM, „Keine KI“). CORS pro Anbieter prüfen und dokumentieren.
- API-Key verschlüsselt gespeichert (vorläufig mit Passphrase, ab M6 über Passkey), Budget und Monatslimit, `llm_calls`
- Datenschutzfilter (`redact.ts`: Regex für E-Mail, Telefon, Adressen, plus Namen über eine Liste bekannter Personen bzw. ein lokales Modell, plus Gesundheitsbegriffe), Vorschau dessen, was rausgeht
- Job-Runner mit `cursor`, Agenten-Protokoll mit Pause und Fortsetzen
- Aufgaben: Tagging-Schemata (Schätzung → Bestätigung → Lauf → Vergleich), Zusammenfassungen, Embeddings und berechnete Links, Ordnervorschläge, Stufen-Pipeline, Notizpflege
- **Abnahme:** Tagging-Lauf auf dem Demo-Archiv mit Schätzung und Bestätigung. Alles Abgeleitete hat `provenance`. Bei erreichtem Limit stoppt der Lauf.

### M4 – Ansichten
- Gehirn 3D (react-three-fiber, Touch-Gesten, Level-of-Detail, Layout im Compute-Worker, deterministische Positionen aus der ID)
- Zeitleiste mit Wiedergabe, Tabellen-Builder (6 Formen), Themenverlauf (Skalierung, Glättung)
- 6 Designs und 7 Paletten, globaler Zeitraum in allen Ansichten
- **Abnahme:** flüssige Darstellung mit dem Demo-Archiv auf dem iPad, ein Tippen öffnet die Details.

### M5 – Befehle und Archiv-Chat
- `commands/tools.ts`, `router.ts` (Tool-Calling), `rules.ts` (ohne KI), Bestätigungsablauf, Archiv-Chat-Ansicht
- **Abnahme:** alle Akzeptanztests aus `BAU-PROMPT.md` Abschnitt 11 grün, mit KI und – soweit sinnvoll – ohne KI.

### M6 – Sicherheit und Backup
- Passkey (WebAuthn, wenn möglich mit PRF) oder Passphrase, automatische Sperre
- Verschlüsseltes Backup und Wiederherstellung (`.denkspur`, AES-GCM, 24 BIP39-Wörter), Erinnerung an Backups
- OpenTimestamps (nur Hash, nur nach Zustimmung). Falls Browser-Aufrufe blockiert werden, verschieben nach M8.
- Entscheidung, ob die gesamte Datenbank verschlüsselt wird (vorher fragen)

### M7 – Weitere Quellen
Gemini (Takeout), Sprachmemos (Transkription per API oder lokal), WhatsApp, Telegram, Discord, Slack, Kindle, Day One, Google Keep, docx, pdf

### M8 – optional: Computer-Begleiter
Node-Programm mit MCP-Server und Live-Aufnahme von Claude Code und Codex. Der Austausch läuft Ende-zu-Ende-verschlüsselt über eine Datei in iCloud Drive.

---

## 8. Demo-Archiv (Spezifikation für `demo/generator.ts`)

Eine erfundene Person: **Jonas Brandt**, Abiturient, Zeitraum **01.03.2026 bis 31.10.2026**. Deterministisch über einen festen Seed. Jedes Element dient einem Akzeptanztest:

| Element | Zweck |
|---|---|
| Quellen: „ChatGPT (Demo)“, „Claude (Demo)“, „Notizen (Demo)“, „Sprachmemos (Demo)“, „WhatsApp (Demo)“ | Quellen-Hub, Ausschluss einer Quelle |
| ca. 300 Einträge, 25 Fäden, 40 Notizen | realistische Menge |
| Projekt „Facharbeit Wildbienen im Stadtpark“ (Schwerpunkt März–Mai) | „alles über meine Facharbeit vom letzten Frühjahr“ |
| Projekte „Fahrradanhänger bauen“ und „Nebenjob-Bewerbung“ | Tabelle „Projekte nach Monat“ |
| wiederkehrende Idee „solarbetriebene Bienentränke“, 4×, zuerst am 12.04.2026 | „Wann hatte ich diese Idee zum ersten Mal?“ |
| Eintrag mit „4.000 Wildbienen“ (gemeint: 400) | Korrektur und Rückgängig |
| Faden mit einem eingefügten Chat eines Freundes | „Dieses Gespräch ist nicht von mir“ |
| zwei Ordner „Facharbeit“ und „Bienen-Projekt“ | Ordner zusammenführen |
| Notiz „Lebenslauf“ mit belegten (Python, Praktikum) und unbelegten Punkten (Leitung Robotik-AG) | Lebenslauf-Prüfung |
| Umlaute und ß in Texten („über“, „Größe“) | Suche ohne Diakritika |
| Assistenten-Antworten in Chat-Fäden | Trennung Nutzer/Assistent |

---

## 9. Abhängigkeiten

Beim Einrichten jeweils die aktuelle stabile Version installieren und neue Abhängigkeiten außerhalb dieser Liste vorher mit mir absprechen.

- **M0:** react, react-dom, react-router-dom, zustand, comlink, @sqlite.org/sqlite-wasm, fflate | dev: vite, @vitejs/plugin-react, typescript, vite-plugin-pwa, vitest, @playwright/test, eslint, prettier
- **M2:** CodeMirror 6 (@codemirror/*)
- **M3:** @anthropic-ai/sdk, openai, @google/genai, @huggingface/transformers, optional @mlc-ai/web-llm
- **M4:** three, @react-three/fiber, @react-three/drei, echarts
- **M6:** @scure/bip39, hash-wasm (Argon2)

---

## 10. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| SQLite-WASM bzw. OPFS verhält sich in iPad-Safari anders | M0 ist ein Spike mit Diagnose-Seite auf dem echten Gerät, bevor weitergebaut wird |
| Safari löscht Daten nicht installierter Websites | Installationsbanner, `persist()`, verschlüsselte Backups mit Erinnerung |
| KI-Anbieter blockieren Browser-Aufrufe (CORS) | in M3 pro Anbieter prüfen, sonst Anbieter weglassen |
| API-Key im Browser (Risiko bei XSS) | strenge CSP, keine Fremdskripte, Key verschlüsselt und nur nach dem Entsperren im Worker-Speicher |
| 3D zu langsam auf älteren iPads | Level-of-Detail, Instancing, Layout im Compute-Worker |
| Hintergrundarbeit endet, wenn die App geschlossen wird | fortsetzbare Jobs mit `cursor` |

## 11. Offene Entscheidungen (Standard, falls ich nichts sage)

1. **Hosting:** GitHub Pages (Standard) oder Cloudflare Pages
2. **KI-Anbieter:** Anthropic (Standard). Dafür braucht es einen eigenen API-Key mit nutzungsbasierter Abrechnung, das ist nicht dasselbe wie ein Claude-Abo. M0 bis M2 brauchen keine KI.
3. **Name:** „Denkspur“ als Arbeitstitel
4. **Verschlüsselung der gesamten Datenbank:** Entscheidung in M6
