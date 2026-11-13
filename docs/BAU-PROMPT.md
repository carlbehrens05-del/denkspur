# Bau-Prompt: Gedankenarchiv als iPad-taugliche Web-App (Arbeitstitel „Denkspur“)

**So benutzt du ihn:** Leg ein leeres Projekt an (am besten als GitHub-Repository) und füg alles ab „PROMPT START“ in Claude Code ein. Claude Code läuft am Computer oder, falls das bei dir verfügbar ist, als Claude Code im Web, das du auch vom iPad aus bedienen kannst. Fertig ist die App eine Website, die du in Safari öffnest und über „Teilen → Zum Home-Bildschirm“ wie eine App installierst. Kostenlos hosten kannst du sie z. B. bei GitHub Pages, Cloudflare Pages oder Vercel. Der Host liefert nur den Code aus und bekommt deine Daten nie zu sehen.

---

## PROMPT START

### 1. Rolle und Ziel

Du bist leitender Entwickler für dieses Projekt. Baue **„Denkspur“** (Arbeitstitel) als **local-first Progressive Web App (PWA)**. Hauptgerät ist ein **iPad mit Safari**, die App muss aber in jedem modernen Browser laufen (auch auf Mac, PC und Handy).

Die App baut aus meinen KI-Chats, Notizen, Sprachmemos und importierten Dateien ein persönliches, datiertes Gedankenarchiv auf, im Folgenden „Record“ genannt. KI-Agenten ordnen dieses Archiv selbst: Sie vergeben Tags, legen Ordner an, setzen Verknüpfungen und schreiben Zusammenfassungen.

**Alle Daten liegen nur im Browser-Speicher meines Geräts.** Der Webserver liefert ausschließlich statische Dateien aus. Es gibt kein Backend, kein Konto und keine Telemetrie. KI-Aufrufe gehen direkt vom Browser an den Anbieter, den ich gewählt habe, mit meinem eigenen API-Key.

Die App basiert auf einem öffentlich beschriebenen Produktkonzept. Übernimm keine fremden Namen, Logos, Texte oder Designs, sondern verwende durchgehend eigenes Branding, eigene Texte und ein eigenes visuelles Design.

### 2. Grundprinzipien (nicht verhandelbar)

1. **Originalworte sind unveränderlich.** Importierte Inhalte werden nur angehängt (append-only) und nie überschrieben.
2. **Abgeleitetes ist getrennt und markiert.** Was Agenten erzeugen (Tags, Zusammenfassungen, Notizen, Links, Ordnervorschläge), liegt getrennt vom Original, ist als „abgeleitet“ gekennzeichnet und verweist auf die Einträge, aus denen es stammt.
3. **Jede Änderung ist eine datierte Version.** Korrekturen erzeugen eine neue Version, die alte bleibt erhalten. Fast jede Aktion lässt sich mit einem Befehl rückgängig machen.
4. **Lokal zuerst.** Nichts verlässt das Gerät ohne meine ausdrückliche Zustimmung.
5. **Die App funktioniert komplett ohne KI und offline.** Im Modus „Keine KI“ laufen Suche, Import, Notizen und Ansichten trotzdem.
6. **Notizen bleiben Markdown.** Ich kann sie jederzeit als Obsidian-kompatiblen Vault (ZIP) exportieren und wieder importieren.
7. **Eine interne API für alles.** Oberfläche, Befehlsfeld und der Archiv-Chat greifen alle über dieselbe interne Schreib- und Lese-API auf den Record zu.
8. **Touch first.** Die Bedienung ist für das iPad optimiert: große Touch-Ziele, Gesten, Split View, und mit Tastatur gibt es zusätzlich Kurzbefehle.

### 3. Tech-Stack (Vorschlag, mit Begründung darfst du abweichen)

- **App:** Vite, React und TypeScript, mit `vite-plugin-pwa` (Service Worker, offline, installierbar, Web-App-Manifest)
- **Datenbank:** offizielles SQLite-WASM (`@sqlite.org/sqlite-wasm`) in einem Web Worker, dauerhaft gespeichert über OPFS. Nimm die VFS-Variante, die in Safari ohne COOP/COEP-Header läuft (z. B. `opfs-sahpool`). FTS5 für die Volltextsuche, Migrationen versioniert.
- **Vektorsuche:** Embeddings als Float32 in SQLite, Kosinus-Ähnlichkeit in einem Worker berechnet (reicht für ein persönliches Archiv)
- **Embeddings:** über die API meines Anbieters oder lokal mit transformers.js (kleines Modell, WebGPU bzw. WASM)
- **3D-Ansicht:** three.js bzw. react-three-fiber mit Touch-Steuerung
- **Diagramme:** ECharts oder visx
- **Krypto:** WebCrypto (AES-GCM, Schlüsselableitung mit PBKDF2 oder Argon2-WASM), BIP39 für Wiederherstellungswörter
- **Entsperren:** WebAuthn-Passkey (Face ID bzw. Touch ID), wenn möglich mit PRF-Erweiterung zur Schlüsselableitung, sonst Passphrase als Fallback
- **LLM-Adapter:** Anthropic, OpenAI und Google direkt aus dem Browser, dazu „Keine KI“ und optional ein lokales Modell im Browser (WebLLM), wenn WebGPU verfügbar ist. Prüfe für jeden Anbieter, ob er Browser-Aufrufe (CORS) erlaubt. Bei Anthropic ist dafür der Header `anthropic-dangerous-direct-browser-access` nötig.
- **Tests:** Vitest, für die Oberfläche Playwright (auch mit WebKit-Engine)
- **Hosting:** statisch, mit strenger Content Security Policy. `connect-src` erlaubt nur die KI-Anbieter, die ich freigeschaltet habe.

### 4. Speicherung im Browser

- Der Record liegt in OPFS und IndexedDB. Beim Start fordert die App `navigator.storage.persist()` an und zeigt mir die Speicherbelegung (`navigator.storage.estimate()`).
- **iPad-Hinweis:** Safari kann Daten von Websites löschen, die nicht zum Home-Bildschirm hinzugefügt wurden. Die App erkennt, ob sie installiert läuft, und fordert mich sonst deutlich zur Installation auf.
- **Backup ist Pflicht:** regelmäßige Erinnerung an ein verschlüsseltes Backup (`.denkspur`-Datei), das ich in „Dateien“ bzw. iCloud Drive ablege. Wiederherstellen geht auf jedem Gerät.
- Original-Dateien (Exporte, Audio, PDFs) werden inhaltsadressiert nach SHA-256 gespeichert und sind schreibgeschützt.

### 5. Datenmodell (SQLite)

- `sources`: id, kind (chatgpt, claude, gemini, obsidian, markdown, voice, whatsapp, kindle, …), label, settings, decision (`include` | `exclude` | `later`), whose_words (`mine` | `others` | `mixed`)
- `blobs`: sha256 (PK), mime, size, imported_at, storage_ref
- `threads`: id, source_id, title, started_at
- `entries`: id, source_id, external_id, thread_id, parent_id, kind (`message` | `note` | `file` | `voice` | `clip`), role (`originator` | `assistant` | `other`), original_created_at, ingested_at, blob_sha, text, content_hash, excluded, not_mine
- `entry_versions`: entry_id, version, text, created_at, actor (`user` | `agent`), reason
- `notes`: id, path (für den Obsidian-Export), title, body_md, author (`user` | `agent`), stage, created_at, und `note_versions`
- `derived`: id, target_type, target_id, kind (`tag` | `summary` | `link` | `folder_suggestion` | `cleaned` | `elaborated` | `digested` | `insight`), payload (JSON), provenance (Liste von entry_ids), agent_run_id, model, status (`proposed` | `accepted` | `rejected`), created_at
- `tag_schemas`, `tag_runs` (mit estimated_tokens, estimated_cost, confirmed_at, Vergleich von Läufen)
- `folders` und `folder_members`, `links` (type `wikilink` | `computed`, score), `exclusion_rules`
- `operations`: op_id, type, payload, inverse_payload, at. Daraus funktioniert „Rückgängig“.
- `consents`, `timestamps`, `agent_log`, `jobs` (Hintergrundaufgaben, fortsetzbar)

**Verarbeitungsstufen einer Notiz:** Roh → Bereinigt → Ausgearbeitet → Verdichtet → Erkenntnisse. Auf jeder Stufe bleiben die Originalworte neben den Änderungen sichtbar.

**Legende in der Oberfläche:** Originaltext, Durchgestrichen, Abgeleitet, Berechnete Verknüpfung.

**Labels:** Ich kann Labels frei vergeben. Eine neue Frage ist nur eine neue Auswahl aus demselben Bestand, kein Neuaufbau.

### 6. Import (auf dem iPad über die Dateiauswahl)

Jeder Importer ist idempotent: Er erkennt Duplikate über Hashes, übernimmt die originalen Zeitstempel, trennt Nutzer- und Assistententext und respektiert Ausschlussregeln. ZIP-Dateien werden im Browser entpackt (z. B. mit fflate). Die Reihenfolge entspricht der Priorität.

1. **ChatGPT-Export** (ZIP mit `conversations.json`, Baumstruktur über die Eltern-Verweise auflösen)
2. **Claude.ai-Export** (ZIP mit `conversations.json`)
3. **Markdown-Dateien bzw. Obsidian-Vault als ZIP** oder als Mehrfachauswahl. Pro Vault entscheide ich „Übernehmen“, „Ausschließen“ oder „Später“ und gebe an, wessen Worte es sind. Ein erneuter Import erkennt Änderungen.
4. **Gemini** über Google Takeout
5. **Sprachmemos** (Audiodateien): Transkription per API oder lokal mit transformers.js (Whisper). Die Audiodatei bleibt als Original erhalten.
6. **Text einfügen:** einzelne Chats oder Notizen per Copy & Paste aufnehmen
7. **Später:** WhatsApp-, Telegram-, Discord- und Slack-Exporte, Kindle („My Clippings.txt“), Day One (JSON), Google Keep (Takeout), Word (.docx), PDFs. APIs wie Notion oder Readwise nur, wenn sie Browser-Aufrufe erlauben, sonst über deren Export-Dateien.

### 7. Agenten-Schicht

- **Job-Warteschlange in einem Web Worker,** fortsetzbar. Auf dem iPad laufen Jobs nur, solange die App offen ist. Deshalb verarbeiten sie kleine Stapel, sichern den Fortschritt und machen beim nächsten Öffnen weiter.
- **Tagging-Schemata in Stapeln:** Vor jedem Lauf schätzt die App Umfang, Tokens und Kosten und fragt nach Bestätigung. Danach kann ich Läufe vergleichen.
- **Zusammenfassen und Verknüpfen:** Ähnlichkeit über Embeddings ergibt berechnete Links. Zusammenfassungen nennen immer ihre Quellen.
- **Ordnervorschläge:** Die Namen richten sich danach, woran ich tatsächlich arbeite. Ich prüfe die Vorschläge, die Inbox wird danach abgelegt.
- **Notizpflege:** „Notizen aktualisieren“ prüft Notizen gegen neue Einträge, und jede Aktualisierung nennt ihre Quellen.
- **Stufen-Pipeline** von Roh bis Erkenntnisse
- **Modellwahl:** eigener API-Key (wird verschlüsselt gespeichert), lokales Browser-Modell oder „Keine KI“
- **Budget:** Die App zeigt den Verbrauch an. Ich setze ein Monatslimit, und bei Erreichen stoppt alles, was Geld kostet.
- **Datenschutzfilter vor jedem externen Aufruf:** Namen, E-Mail-Adressen, Telefonnummern und Gesundheitsangaben anderer Personen werden entfernt (Regex plus optional lokales Modell). Danach sehe ich eine Vorschau dessen, was rausgeht, und muss zustimmen.
- **Agenten-Protokoll** als Live-Ansicht mit Pause und Fortsetzen

### 8. Oberfläche (eigenes Design, iPad-optimiert)

**Grundlayout**
- **Oben:** ein einziges Befehlsfeld (mit Tastatur: Cmd+K). Dort stelle ich Fragen in Alltagssprache, suche nach Einträgen, Ordnern und Tags und führe Befehle aus. Antworten erscheinen als Ansicht meiner eigenen Einträge, mit Quellenangabe. Diktieren über die iPad-Tastatur funktioniert ganz normal.
- **Links:** einklappbare Seitenleiste mit Gehirn, Zeitleiste, Notizen, Fäden, Ordner, Tabellen, Themenverlauf, Archiv-Chat, Agenten-Protokoll und Quellen
- **Rechts:** Detailbereich, in dem Originaltext und Agententext sichtbar getrennt sind (mit Legende). Im Hochformat wird er zu einem Sheet.
- **Global:** Ein Zeitraumfilter gilt für alle Ansichten.
- **Layouts:** Hoch- und Querformat, Split View bzw. Stage Manager. Auf dem Handy gibt es ein vereinfachtes Layout.

**Ansichten**
1. **Gehirn-Ansicht (3D):** Jeder Punkt steht für eine Notiz, und die Punkte bilden zusammen eine gehirnförmige Wolke. Ein „Stamm“ zeigt die Rohquellen (Nachrichten, Dateien). Farben stehen für Gruppen, eine Legende erklärt sie. Mit zwei Fingern drehe und zoome ich, Suchtreffer werden hervorgehoben, ein Tippen öffnet die Details. Auf älteren iPads sorgt ein Level-of-Detail für flüssige Darstellung.
2. **Zeitleiste** mit Wiedergabe (Pause, ←, →, Zeitanzeige). Sie zeigt, wie der Record gewachsen ist.
3. **Notizseite** mit Reitern für die fünf Stufen, dazu ein Markdown-Editor mit `[[`-Autovervollständigung
4. **Faden-Leser:** zeigt einen Gesprächsfaden vollständig und die Antworten auf eine einzelne Nachricht
5. **Tabellen-Builder:** zwei Eigenschaften als Achsen, eine dritte als Filter, sechs Darstellungsformen (Tabelle, Heatmap, Balken, gestapelte Balken, Punkte, Linien)
6. **Themenverlauf:** Themen als Linien auf einer gemeinsamen Zeitachse, mit Skalierung (absolut, relativ, log) und Glättung
7. **Archiv-Chat:** Ich unterhalte mich mit meinem Archiv. Das Modell nutzt dabei per Tool-Calling die interne API (siehe Abschnitt 9).
8. **Agenten-Protokoll**
9. **Quellen-Hub:** Import und Entscheidung pro Quelle
10. **Einstellungen:** Modelle und Budget, Sicherheit, Backup und Wiederherstellung, Zeitstempel, Ausschlussregeln, Speicherbelegung

**Weiteres**
- **Schnellerfassung:** ein schwebender „+“-Knopf, der Text an die heutige Tagesnotiz anhängt. Dazu gibt es eine URL `/capture?text=…`, die ich mit der Kurzbefehle-App auf dem iPad aufrufen kann.
- **Gestaltung:** sechs Oberflächen-Designs (darunter hell und dunkel, folgt der Systemeinstellung) und sieben Datenpaletten mit eigenen Namen
- **Ersteinrichtung:** Hinweis „Zum Home-Bildschirm hinzufügen“, Passkey oder Passphrase anlegen, Wiederherstellungswörter sichern, KI-Modus wählen. Danach öffnet sich der Quellen-Hub mit Anleitungen, wie ich die Exporte bei ChatGPT, Claude und Gemini anfordere.
- **Hilfe:** eine Seite „So sammelt Denkspur“

### 9. KI-Werkzeuge (Archiv-Chat und Befehlsfeld)

- **Werkzeuge der internen API für das Modell:** `search`, `ask` (mit Quellen), `get_entry`, `get_thread`, `update_entry` (erzeugt eine neue Version), `propose_note`, `create_note`, `propose_folders`, `create_folder`, `run_tagging` (mit Schätzung und Bestätigung), `open_view`, `build_table`, `add_exclusion_rule`, `mark_not_mine`, `backup`, `timestamp`, `check_resume`
- **Vor dem Senden** läuft alles durch den Datenschutzfilter. Schreibende Aktionen zeigen mir eine Bestätigung.
- **Jeder Tool-Aufruf wird protokolliert.**
- **Optional später (eigener Meilenstein):** ein kleiner Begleiter für den Computer (Node). Er stellt einen MCP-Server für Claude Code, Claude Desktop und andere bereit, nimmt Claude-Code- und Codex-Sitzungen live auf und tauscht Daten nur über eine Ende-zu-Ende-verschlüsselte Datei (z. B. in iCloud Drive) mit der Web-App aus. Kein zentraler Server.

### 10. Sicherheit

- **Entsperren** per Passkey (Face ID bzw. Touch ID) oder Passphrase, mit automatischer Sperre nach Inaktivität
- **Verschlüsselung:** sensible Felder (API-Keys) und alle Backups mit AES-GCM. Bewerte, ob die gesamte Datenbank verschlüsselt werden soll, und frag mich.
- **Verschlüsseltes Backup bzw. Sync** als Datei mit Passphrase oder 24 BIP39-Wörtern. Damit überträgt man auch auf ein zweites Gerät.
- **OpenTimestamps (optional):** Merkle-Root (SHA-256) über den Record-Zustand. Nur dieser 32-Byte-Hash geht an die öffentlichen Kalender, und nur nach Zustimmung. Prüfe, ob die Kalender Browser-Aufrufe erlauben, sonst verschiebst du das in den Computer-Begleiter.
- **Strenge CSP, keine Drittanbieter-Skripte,** keine Analytics, keine Telemetrie

### 11. Befehle als Akzeptanztests

Das Befehlsfeld versteht natürliche Sprache: Mit KI nutzt es Tool-Calling, im Modus „Keine KI“ einen regelbasierten Fallback. Alle Befehle unten müssen mit den Testdaten funktionieren.

| Befehl | Erwartetes Verhalten |
|---|---|
| „Zeig mir alles über meine Facharbeit vom letzten Frühjahr.“ | Gehirn-Ansicht markiert die Treffer, der Zeitraum wird global gesetzt |
| „Mach eine Tabelle: Projekte nach Monat.“ | Tabellen-Builder öffnet sich mit diesen Achsen |
| „Öffne die Zeitleiste im Oktober.“ | Jede Ansicht lässt sich per Name öffnen |
| „Wann hatte ich diese Idee zum ersten Mal?“ | Antwort nennt die verwendeten Einträge und zeigt sie an |
| „Das ist falsch, es muss 400 heißen, nicht 4.000.“ | Korrektur als neue Version, das Original bleibt in der Historie |
| „Diese beiden Ordner sind dasselbe Projekt.“ | Zusammenführen ohne Neuablage, rückgängig machbar |
| „Dieses Gespräch ist nicht von mir.“ | Verschwindet aus Gehirn, Suche und Notizen |
| „Halte meine Nachrichten aus [Quelle] raus.“ | Ganze Quelle wird dauerhaft ausgeschlossen |
| „Bring meine Notizen auf den neuesten Stand.“ | Notizen werden geprüft, jede Änderung nennt Quellen |
| „Leg meine Ordner an.“ | Ordnervorschläge nach echten Projekten, Inbox wird abgelegt |
| „Was in meinem Lebenslauf ist durch mein Archiv noch nicht belegt?“ | Punktweise Prüfung mit Belegen |
| „Mach das rückgängig.“ | Letzte Operation wird zurückgenommen |

### 12. Testdaten

Erzeuge einen **erfundenen** Record als Testdaten: eine fiktive Person, etwa 6 Monate mit Chats, Notizen, Sprachmemo-Transkripten, mehreren Projekten und einer Idee, die mehrmals wiederkehrt. Die Testdaten lassen sich in der App per Knopf laden („Demo-Archiv“). In Tests werden niemals echte Daten verwendet.

### 13. Meilensteine

- **M0 (technischer Spike zuerst):** PWA-Grundgerüst, SQLite-WASM mit OPFS im Worker, offline-fähig und installierbar. **Teste das auf einem echten iPad in Safari bzw. als Home-Bildschirm-App,** bevor du weitermachst. Danach DB-Schema mit Migrationen, interne API, Testdaten-Generator und Deployment auf statisches Hosting.
- **M1:** Import von ChatGPT- und Claude-Exporten sowie Markdown bzw. Vault-ZIP. Dazu Dedup, Versionierung, Faden-Leser, Volltextsuche und das Befehlsfeld (zunächst nur Suche).
- **M2:** Notizen: Editor, `[[Links]]`, Tagesnotiz, Schnellerfassung inkl. Kurzbefehle-URL, Obsidian-Export und -Import
- **M3:** KI-Schicht: Adapter (direkt aus dem Browser), Budget, Datenschutzfilter, Tagging mit Schätzung und Bestätigung, Zusammenfassungen, Embeddings, berechnete Links, Stufen, fortsetzbare Jobs, Agenten-Protokoll
- **M4:** Ansichten mit Touch-Bedienung: Gehirn 3D, Zeitleiste, Tabellen-Builder, Themenverlauf, Designs und Paletten, globaler Zeitraum
- **M5:** Befehls-Router, Archiv-Chat, Rückgängig. Alle Akzeptanztests aus Abschnitt 11 laufen grün.
- **M6:** Sicherheit: Passkey bzw. Passphrase, Verschlüsselung, verschlüsseltes Backup und Wiederherstellung, Speicher-Persistenz, OpenTimestamps
- **M7:** weitere Quellen (Gemini, Sprachmemos, Messenger-Exporte, Kindle, Day One, …)
- **M8 (optional):** Computer-Begleiter mit MCP-Server und Live-Aufnahme

**Pro Meilenstein:** implementieren, Tests schreiben, mit den Testdaten vorführen, `PROGRESS.md` aktualisieren und eine neue Version deployen. Danach fasst du kurz auf Deutsch zusammen, was neu ist und wie ich es auf dem iPad teste, und **fragst mich, bevor du den nächsten Meilenstein beginnst.**

### 14. Nicht bauen

Kein eigener Server für Nutzerdaten, keine Konten, keine Lizenzmodelle, keine Marktplätze für Labore, keine Forschungsprogramme, keine Royalty-Logik. Das hier ist eine rein persönliche App, deren Daten auf dem Gerät bleiben.

### 15. Start

Lies diesen Prompt komplett. Stell mir höchstens 3 Rückfragen, falls etwas wirklich unklar ist, und beginne dann mit M0.

## PROMPT ENDE
