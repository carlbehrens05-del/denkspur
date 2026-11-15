# Denkspur

Ein persönliches, datiertes Gedankenarchiv aus KI-Chats, Notizen und Sprachmemos, das sich selbst ordnet. Es läuft als Web-App im Browser und auf dem iPad als App vom Home-Bildschirm. Alle Daten bleiben auf dem Gerät (SQLite-WASM im Browser-Speicher OPFS). Es gibt kein Backend, kein Konto und keine Telemetrie.

**Stand:** Meilenstein M0 (Fundament und iPad-Spike) – siehe `PROGRESS.md`.

**Live:** https://carlbehrens05-del.github.io/denkspur/ (nach dem ersten Deployment, siehe unten)

- Plan: `docs/GLIEDERUNG.md`
- Spezifikation: `docs/BAU-PROMPT.md`
- Regeln für Claude Code: `CLAUDE.md`

## Lokal starten

Voraussetzungen: Node.js 22 und pnpm 10 (`corepack enable` aktiviert pnpm automatisch).

```bash
pnpm install
pnpm dev          # Entwicklungsserver: http://localhost:5173/denkspur/
pnpm build        # Produktions-Build nach dist/
pnpm preview      # Build ansehen: http://localhost:4173/denkspur/
pnpm test         # Unit-Tests (Vitest, SQLite-WASM im Speicher unter Node)
pnpm test:e2e     # E2E-Tests (Playwright: Chromium, WebKit, iPad-Emulation)
pnpm lint         # ESLint + Prettier
python3 tools/check_schema.py src/core/db/migrations/0001_init.sql
```

Vor dem ersten `pnpm test:e2e` einmalig die Browser installieren:

```bash
pnpm exec playwright install --with-deps chromium webkit
```

Hinweise:

- Der Service Worker (Offline-Cache) ist nur im Produktions-Build aktiv (`pnpm build && pnpm preview`), nicht in `pnpm dev`.
- Die strenge Content Security Policy wird ebenfalls nur im Build gesetzt.
- Der Basis-Pfad ist `/denkspur/` (GitHub Pages). Für einen Host im Wurzelverzeichnis: `DENKSPUR_BASE=/ pnpm build`.

## Deployment (GitHub Pages)

Der Workflow `.github/workflows/ci-deploy.yml` läuft bei jedem Push:

1. **test:** Lint, Schema-Schnelltest, Unit-Tests, E2E-Tests (Chromium + WebKit + iPad)
2. **build + deploy:** nur auf dem Standard-Branch `main` – baut mit dem Basis-Pfad `/<repository>/` und veröffentlicht auf GitHub Pages

**Einmalig einrichten:** Im Repository auf GitHub unter **Settings → Pages → Build and deployment → Source** „**GitHub Actions**“ auswählen. Danach veröffentlicht jeder Push auf `main` automatisch. Den Stand eines Laufs siehst du unter **Actions**.

GitHub Pages liefert Unterseiten wie `/denkspur/diagnose` über eine Kopie von `index.html` als `404.html` aus. Ist die App einmal geladen, bedient der Service Worker alle Seiten – auch offline.

## Auf dem iPad testen

1. In **Safari** (nicht im privaten Modus) `https://carlbehrens05-del.github.io/denkspur/` öffnen.
2. **Teilen-Symbol → „Zum Home-Bildschirm“** → „Hinzufügen“. Denkspur ab jetzt nur über das neue Symbol starten – nur dann gilt der Speicher als dauerhaft.
3. In der App **Diagnose** öffnen (Menü ☰ oben links im Hochformat). Erwartet: alle wichtigen Ampeln grün.
4. **Start → „Demo-Archiv laden“**, dann oben z. B. „Facharbeit“ oder „uber“ suchen.

Die vollständige Abnahme-Checkliste steht in `PROGRESS.md`.

## Architektur in Kürze

```
UI (React, Haupt-Thread) ──Comlink── DB-Worker (DenkspurApi → Services → SQLite-WASM, VFS opfs-sahpool)
```

- `src/core/api/contract.ts` – der eine API-Vertrag für UI, Befehle, Chat, Agenten und Importer
- `src/core/db/` – Worker, Migrationen (`migrations/0001_init.sql`), Db-Abstraktion
- `src/core/services/` – Geschäftslogik; jede Schreibaktion schreibt eine Operation mit Inverse (Rückgängig)
- `src/demo/` – erfundenes, deterministisches Demo-Archiv (Jonas Brandt, März–Oktober 2026)
- `src/app/`, `src/views/` – Oberfläche (alle Texte in `src/app/i18n/de.ts`)
