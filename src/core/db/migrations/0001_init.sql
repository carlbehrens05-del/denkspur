-- Denkspur – Migration 0001: Grundschema
-- Konventionen:
--   * IDs: TEXT, zeitlich sortierbar (siehe src/core/util/ids.ts)
--   * Zeitpunkte: TEXT im ISO-8601-Format, UTC (z. B. 2026-11-13T11:20:00.000Z)
--   * JSON-Felder: TEXT mit gültigem JSON
--   * Originale sind unveränderlich (Trigger unten). Korrekturen = neue Versionen.
--   * Jede Schreibaktion von Nutzer oder Agent erzeugt eine Zeile in `operations` (für Rückgängig).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- System
-- ---------------------------------------------------------------------------

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,            -- JSON
  updated_at TEXT NOT NULL
);

CREATE TABLE operations (
  op_id      TEXT PRIMARY KEY,
  type       TEXT NOT NULL,            -- z. B. entry.correct, folder.merge, thread.not_mine, import.run
  actor      TEXT NOT NULL CHECK (actor IN ('user', 'agent', 'system')),
  payload    TEXT NOT NULL,            -- JSON: was getan wurde
  inverse    TEXT NOT NULL,            -- JSON: wie es rückgängig gemacht wird
  created_at TEXT NOT NULL,
  undone_at  TEXT,
  undo_of    TEXT REFERENCES operations(op_id)
);
CREATE INDEX operations_created ON operations(created_at);

CREATE TABLE consents (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,            -- llm_provider | timestamp | backup_reminder | ...
  scope      TEXT NOT NULL DEFAULT '{}',
  granted_at TEXT NOT NULL,
  revoked_at TEXT
);

-- ---------------------------------------------------------------------------
-- Quellen, Originale, Importe
-- ---------------------------------------------------------------------------

CREATE TABLE sources (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL,        -- chatgpt | claude | gemini | markdown | obsidian | voice | paste | whatsapp | kindle | dayone | keep | docx | pdf | demo
  label          TEXT NOT NULL,
  decision       TEXT NOT NULL DEFAULT 'later' CHECK (decision IN ('include', 'exclude', 'later')),
  whose_words    TEXT NOT NULL DEFAULT 'mine' CHECK (whose_words IN ('mine', 'others', 'mixed')),
  settings       TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL,
  last_import_at TEXT
);

CREATE TABLE blobs (
  sha256        TEXT PRIMARY KEY,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  storage_ref   TEXT NOT NULL,         -- Pfad im OPFS, z. B. originals/ab/abcdef…
  original_name TEXT,
  imported_at   TEXT NOT NULL
);

CREATE TABLE imports (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES sources(id),
  blob_sha    TEXT REFERENCES blobs(sha256),
  op_id       TEXT REFERENCES operations(op_id),
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed')),
  stats       TEXT NOT NULL DEFAULT '{}' -- JSON: {added, duplicates, skipped, errors}
);

-- ---------------------------------------------------------------------------
-- Fäden und Einträge (Originale)
-- ---------------------------------------------------------------------------

CREATE TABLE threads (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT,
  title       TEXT,
  started_at  TEXT,
  not_mine    INTEGER NOT NULL DEFAULT 0 CHECK (not_mine IN (0, 1)),
  UNIQUE (source_id, external_id)
);

CREATE TABLE entries (
  id                  TEXT PRIMARY KEY,
  source_id           TEXT NOT NULL REFERENCES sources(id),
  import_id           TEXT REFERENCES imports(id),
  external_id         TEXT,
  thread_id           TEXT REFERENCES threads(id),
  parent_id           TEXT REFERENCES entries(id),
  kind                TEXT NOT NULL CHECK (kind IN ('message', 'note', 'file', 'voice', 'clip')),
  role                TEXT NOT NULL CHECK (role IN ('originator', 'assistant', 'other')),
  original_created_at TEXT NOT NULL,
  ingested_at         TEXT NOT NULL,
  blob_sha            TEXT REFERENCES blobs(sha256),
  original_text       TEXT NOT NULL,
  content_hash        TEXT NOT NULL UNIQUE, -- sha256(kind|role|original_created_at|original_text) → Duplikaterkennung
  current_version     INTEGER NOT NULL DEFAULT 1,
  excluded            INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  not_mine            INTEGER NOT NULL DEFAULT 0 CHECK (not_mine IN (0, 1))
);
CREATE INDEX entries_time   ON entries(original_created_at);
CREATE INDEX entries_thread ON entries(thread_id);
CREATE INDEX entries_source ON entries(source_id);
CREATE INDEX entries_parent ON entries(parent_id);

-- Originale dürfen nie verändert werden.
CREATE TRIGGER entries_original_immutable
BEFORE UPDATE OF original_text, original_created_at, content_hash, kind, role, source_id, blob_sha ON entries
BEGIN
  SELECT RAISE(ABORT, 'entries: Original ist unveraenderlich');
END;

-- Einträge werden nie gelöscht (Ausblenden über excluded/not_mine).
-- Endgültiges Löschen nur über die bewusste Wartungsfunktion purgeEntries() (späterer Meilenstein).
CREATE TRIGGER entries_append_only
BEFORE DELETE ON entries
BEGIN
  SELECT RAISE(ABORT, 'entries: nur anhaengen, nicht loeschen');
END;

-- Versionen ab 2 (Version 1 = entries.original_text)
CREATE TABLE entry_versions (
  entry_id   TEXT NOT NULL REFERENCES entries(id),
  version    INTEGER NOT NULL CHECK (version >= 2),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  actor      TEXT NOT NULL CHECK (actor IN ('user', 'agent')),
  reason     TEXT,
  op_id      TEXT REFERENCES operations(op_id),
  PRIMARY KEY (entry_id, version)
);

CREATE TRIGGER entry_versions_immutable
BEFORE UPDATE ON entry_versions
BEGIN
  SELECT RAISE(ABORT, 'entry_versions: Versionen sind unveraenderlich');
END;

-- Aktueller Text eines Eintrags
CREATE VIEW entries_current AS
SELECT
  e.*,
  COALESCE(v.text, e.original_text) AS text,
  (e.current_version > 1)           AS is_corrected
FROM entries e
LEFT JOIN entry_versions v
  ON v.entry_id = e.id AND v.version = e.current_version;

-- Sichtbare Einträge (für Gehirn, Suche, Notizen, Ansichten)
CREATE VIEW entries_visible AS
SELECT ec.*
FROM entries_current ec
JOIN sources s ON s.id = ec.source_id
LEFT JOIN threads t ON t.id = ec.thread_id
WHERE ec.excluded = 0
  AND ec.not_mine = 0
  AND s.decision = 'include'
  AND COALESCE(t.not_mine, 0) = 0;

-- ---------------------------------------------------------------------------
-- Notizen (Markdown, Obsidian-kompatibel exportierbar)
-- ---------------------------------------------------------------------------

CREATE TABLE notes (
  id              TEXT PRIMARY KEY,
  path            TEXT NOT NULL UNIQUE,  -- z. B. "Projekte/Facharbeit.md", Agenten-Notizen unter "_agent/"
  title           TEXT NOT NULL,
  author          TEXT NOT NULL CHECK (author IN ('user', 'agent')),
  stage           TEXT NOT NULL DEFAULT 'raw'
                  CHECK (stage IN ('raw', 'cleaned', 'elaborated', 'digested', 'insights')),
  is_daily        INTEGER NOT NULL DEFAULT 0 CHECK (is_daily IN (0, 1)),
  daily_date      TEXT UNIQUE,           -- YYYY-MM-DD, nur bei Tagesnotizen
  current_version INTEGER NOT NULL DEFAULT 1,
  source_entry_id TEXT REFERENCES entries(id), -- falls aus importierter Markdown-Datei entstanden
  archived        INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX notes_updated ON notes(updated_at);

CREATE TABLE note_versions (
  note_id    TEXT NOT NULL REFERENCES notes(id),
  version    INTEGER NOT NULL CHECK (version >= 1),
  body_md    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  actor      TEXT NOT NULL CHECK (actor IN ('user', 'agent')),
  reason     TEXT,
  op_id      TEXT REFERENCES operations(op_id),
  PRIMARY KEY (note_id, version)
);

CREATE TRIGGER note_versions_immutable
BEFORE UPDATE ON note_versions
BEGIN
  SELECT RAISE(ABORT, 'note_versions: Versionen sind unveraenderlich');
END;

CREATE VIEW notes_current AS
SELECT n.*, v.body_md
FROM notes n
JOIN note_versions v ON v.note_id = n.id AND v.version = n.current_version;

-- ---------------------------------------------------------------------------
-- Agenten: Läufe, Jobs, Protokoll, KI-Aufrufe
-- ---------------------------------------------------------------------------

CREATE TABLE agent_runs (
  id          TEXT PRIMARY KEY,
  task        TEXT NOT NULL,           -- tagging | summarize | embed | link | folders | stages | notes_refresh | resume_check
  params      TEXT NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL CHECK (status IN ('estimated', 'confirmed', 'running', 'paused', 'done', 'failed', 'cancelled')),
  estimate    TEXT,                    -- JSON: {items, inputTokens, outputTokens, costUsdMicros}
  confirmed_at TEXT,
  started_at  TEXT,
  finished_at TEXT,
  stats       TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE jobs (
  id         TEXT PRIMARY KEY,
  run_id     TEXT REFERENCES agent_runs(id),
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed', 'paused', 'cancelled')),
  attempts   INTEGER NOT NULL DEFAULT 0,
  cursor     TEXT,                     -- Fortschritt, damit Jobs nach App-Neustart weiterlaufen
  error      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX jobs_status ON jobs(status);

CREATE TABLE agent_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id  TEXT REFERENCES agent_runs(id),
  ts      TEXT NOT NULL,
  level   TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data    TEXT
);

CREATE TABLE llm_calls (
  id              TEXT PRIMARY KEY,
  provider        TEXT NOT NULL,       -- anthropic | openai | google | webllm
  model           TEXT NOT NULL,
  purpose         TEXT NOT NULL,       -- tagging | chat | command | embed | ...
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cost_usd_micros INTEGER,             -- 1 USD = 1_000_000
  redactions      INTEGER NOT NULL DEFAULT 0,
  run_id          TEXT REFERENCES agent_runs(id),
  created_at      TEXT NOT NULL
);
CREATE INDEX llm_calls_created ON llm_calls(created_at);

-- ---------------------------------------------------------------------------
-- Abgeleitetes (immer getrennt vom Original, immer mit Herkunft)
-- ---------------------------------------------------------------------------

CREATE TABLE derived (
  id          TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note', 'thread', 'folder')),
  target_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('summary', 'title', 'cleaned', 'elaborated', 'digested', 'insight', 'folder_suggestion')),
  payload     TEXT NOT NULL,           -- JSON
  provenance  TEXT NOT NULL DEFAULT '[]', -- JSON-Array von Entry-IDs
  run_id      TEXT REFERENCES agent_runs(id),
  model       TEXT,
  status      TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  created_at  TEXT NOT NULL
);
CREATE INDEX derived_target ON derived(target_type, target_id);

-- ---------------------------------------------------------------------------
-- Tags / Labels
-- ---------------------------------------------------------------------------

CREATE TABLE tag_schemas (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,            -- JSON: {tags?: string[], rules: string, multi: boolean}
  prompt     TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  schema_id  TEXT REFERENCES tag_schemas(id),
  created_by TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
  created_at TEXT NOT NULL
);

CREATE TABLE taggings (
  tag_id      TEXT NOT NULL REFERENCES tags(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note', 'thread')),
  target_id   TEXT NOT NULL,
  run_id      TEXT REFERENCES agent_runs(id),
  created_by  TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
  created_at  TEXT NOT NULL,
  PRIMARY KEY (tag_id, target_type, target_id)
);
CREATE INDEX taggings_target ON taggings(target_type, target_id);

-- ---------------------------------------------------------------------------
-- Ordner (Zusammenführen ohne Neuablage über merged_into)
-- ---------------------------------------------------------------------------

CREATE TABLE folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES folders(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('proposed', 'active', 'merged', 'archived')),
  merged_into TEXT REFERENCES folders(id),
  is_inbox    INTEGER NOT NULL DEFAULT 0 CHECK (is_inbox IN (0, 1)),
  created_by  TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
  created_at  TEXT NOT NULL
);

CREATE TABLE folder_members (
  folder_id   TEXT NOT NULL REFERENCES folders(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note', 'thread')),
  target_id   TEXT NOT NULL,
  created_by  TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
  created_at  TEXT NOT NULL,
  PRIMARY KEY (folder_id, target_type, target_id)
);

-- ---------------------------------------------------------------------------
-- Verknüpfungen, Embeddings
-- ---------------------------------------------------------------------------

CREATE TABLE links (
  id         TEXT PRIMARY KEY,
  from_type  TEXT NOT NULL CHECK (from_type IN ('entry', 'note', 'thread')),
  from_id    TEXT NOT NULL,
  to_type    TEXT NOT NULL CHECK (to_type IN ('entry', 'note', 'thread')),
  to_id      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('wikilink', 'computed')),
  score      REAL,
  run_id     TEXT REFERENCES agent_runs(id),
  created_at TEXT NOT NULL,
  UNIQUE (from_type, from_id, to_type, to_id, type)
);
CREATE INDEX links_from ON links(from_type, from_id);
CREATE INDEX links_to   ON links(to_type, to_id);

CREATE TABLE embeddings (
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note', 'thread')),
  target_id   TEXT NOT NULL,
  model       TEXT NOT NULL,
  dim         INTEGER NOT NULL,
  vector      BLOB NOT NULL,           -- Float32Array, little endian
  created_at  TEXT NOT NULL,
  PRIMARY KEY (target_type, target_id, model)
);

-- ---------------------------------------------------------------------------
-- Ausschlussregeln
-- ---------------------------------------------------------------------------

CREATE TABLE exclusion_rules (
  id         TEXT PRIMARY KEY,
  scope      TEXT NOT NULL CHECK (scope IN ('source', 'thread', 'pattern', 'role')),
  source_id  TEXT REFERENCES sources(id),
  thread_id  TEXT REFERENCES threads(id),
  pattern    TEXT,                     -- Regex auf den Text
  role       TEXT CHECK (role IN ('originator', 'assistant', 'other')),
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  op_id      TEXT REFERENCES operations(op_id),
  created_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Zeitstempel (OpenTimestamps)
-- ---------------------------------------------------------------------------

CREATE TABLE timestamps (
  id             TEXT PRIMARY KEY,
  merkle_root    TEXT NOT NULL,        -- hex, 32 Byte
  covered_until  TEXT NOT NULL,
  proof_blob_sha TEXT REFERENCES blobs(sha256),
  status         TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
  created_at     TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Volltextsuche (vom Code gepflegt: bei Insert/neuer Version löschen + neu einfügen)
-- ---------------------------------------------------------------------------

CREATE VIRTUAL TABLE search_index USING fts5(
  target_type UNINDEXED,
  target_id   UNINDEXED,
  title,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);

INSERT INTO meta (key, value) VALUES ('schema_version', '1');
