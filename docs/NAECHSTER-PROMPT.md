# Nächster Prompt – M0 bauen

Diesen Text in Claude Code einfügen, im Projektordner `denkspur/` (oder im GitHub-Repo mit diesen Dateien):

---

Lies `CLAUDE.md`, `docs/GLIEDERUNG.md` und `PROGRESS.md` vollständig.

Setze **Meilenstein M0** um, Aufgaben M0.1 bis M0.10 in dieser Reihenfolge. Die vorbereiteten Dateien (`0001_init.sql`, `types.ts`, `contract.ts`) sind verbindlich. Baue darauf auf und ändere sie nur mit Begründung.

Meine Entscheidungen:
- Hosting: [GitHub Pages / Cloudflare Pages]
- Repository-Name: [z. B. denkspur]

Wichtig:
1. Prüfe nach M0.3 sofort mit `pnpm build && pnpm preview`, ob SQLite-WASM mit `opfs-sahpool` startet. Die Diagnose-Seite muss so früh wie möglich laufen, damit ich sie auf dem iPad testen kann.
2. Alle Unit-Tests und E2E-Tests (auch WebKit) müssen grün sein.
3. Zum Schluss: `PROGRESS.md` aktualisieren und mir auf Deutsch erklären, wie ich die App auf dem iPad installiere und die Abnahme-Punkte von M0 prüfe.

Frag mich, bevor du mit M1 beginnst.
