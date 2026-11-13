/**
 * Denkspur – Kerntypen des Datenmodells.
 * Spiegeln das SQL-Schema in src/core/db/migrations/0001_init.sql.
 * Regeln: keine React-Imports in src/core, Zeitpunkte als ISO-8601-UTC-Strings.
 */

export type Id = string;
export type IsoDateTime = string; // z. B. "2026-11-13T11:20:00.000Z"
export type IsoDate = string; // z. B. "2026-11-13"

export type Actor = 'user' | 'agent' | 'system';
export type Author = 'user' | 'agent';

// ---------------------------------------------------------------------------
// Quellen und Originale
// ---------------------------------------------------------------------------

export type SourceKind =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'markdown'
  | 'obsidian'
  | 'voice'
  | 'paste'
  | 'whatsapp'
  | 'kindle'
  | 'dayone'
  | 'keep'
  | 'docx'
  | 'pdf'
  | 'demo';

export type SourceDecision = 'include' | 'exclude' | 'later';
export type WhoseWords = 'mine' | 'others' | 'mixed';

export interface Source {
  id: Id;
  kind: SourceKind;
  label: string;
  decision: SourceDecision;
  whoseWords: WhoseWords;
  settings: Record<string, unknown>;
  createdAt: IsoDateTime;
  lastImportAt: IsoDateTime | null;
}

export interface BlobRef {
  sha256: string;
  mime: string;
  size: number;
  storageRef: string;
  originalName: string | null;
  importedAt: IsoDateTime;
}

export type EntryKind = 'message' | 'note' | 'file' | 'voice' | 'clip';
export type EntryRole = 'originator' | 'assistant' | 'other';

export interface Thread {
  id: Id;
  sourceId: Id;
  externalId: string | null;
  title: string | null;
  startedAt: IsoDateTime | null;
  notMine: boolean;
}

export interface Entry {
  id: Id;
  sourceId: Id;
  importId: Id | null;
  externalId: string | null;
  threadId: Id | null;
  parentId: Id | null;
  kind: EntryKind;
  role: EntryRole;
  originalCreatedAt: IsoDateTime;
  ingestedAt: IsoDateTime;
  blobSha: string | null;
  /** Unveränderliche Originalworte (Version 1). */
  originalText: string;
  /** Aktueller Text (Original oder letzte Korrektur). */
  text: string;
  contentHash: string;
  currentVersion: number;
  isCorrected: boolean;
  excluded: boolean;
  notMine: boolean;
}

export interface EntryVersion {
  entryId: Id;
  version: number; // >= 2
  text: string;
  createdAt: IsoDateTime;
  actor: Author;
  reason: string | null;
  opId: Id | null;
}

// ---------------------------------------------------------------------------
// Notizen
// ---------------------------------------------------------------------------

/** Verarbeitungsstufen: Roh → Bereinigt → Ausgearbeitet → Verdichtet → Erkenntnisse */
export type Stage = 'raw' | 'cleaned' | 'elaborated' | 'digested' | 'insights';
export const STAGES: readonly Stage[] = ['raw', 'cleaned', 'elaborated', 'digested', 'insights'] as const;

export interface Note {
  id: Id;
  path: string;
  title: string;
  author: Author;
  stage: Stage;
  isDaily: boolean;
  dailyDate: IsoDate | null;
  currentVersion: number;
  sourceEntryId: Id | null;
  archived: boolean;
  bodyMd: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface NoteVersion {
  noteId: Id;
  version: number;
  bodyMd: string;
  createdAt: IsoDateTime;
  actor: Author;
  reason: string | null;
  opId: Id | null;
}

// ---------------------------------------------------------------------------
// Abgeleitetes, Tags, Ordner, Links
// ---------------------------------------------------------------------------

export type TargetType = 'entry' | 'note' | 'thread';
export interface TargetRef {
  type: TargetType;
  id: Id;
}

export type DerivedKind =
  | 'summary'
  | 'title'
  | 'cleaned'
  | 'elaborated'
  | 'digested'
  | 'insight'
  | 'folder_suggestion';

export type DerivedStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded';

export interface Derived {
  id: Id;
  targetType: TargetType | 'folder';
  targetId: Id;
  kind: DerivedKind;
  payload: Record<string, unknown>;
  /** Entry-IDs, aus denen das Abgeleitete stammt. Pflicht für alles, was ein Agent erzeugt. */
  provenance: Id[];
  runId: Id | null;
  model: string | null;
  status: DerivedStatus;
  createdAt: IsoDateTime;
}

export interface TagSchema {
  id: Id;
  name: string;
  definition: { tags?: string[]; rules: string; multi: boolean };
  prompt: string | null;
  createdAt: IsoDateTime;
}

export interface Tag {
  id: Id;
  name: string;
  schemaId: Id | null;
  createdBy: Author;
  createdAt: IsoDateTime;
}

export type FolderStatus = 'proposed' | 'active' | 'merged' | 'archived';

export interface Folder {
  id: Id;
  name: string;
  parentId: Id | null;
  status: FolderStatus;
  mergedInto: Id | null;
  isInbox: boolean;
  createdBy: Author;
  createdAt: IsoDateTime;
}

export type LinkType = 'wikilink' | 'computed';

export interface Link {
  id: Id;
  from: TargetRef;
  to: TargetRef;
  type: LinkType;
  score: number | null;
  runId: Id | null;
  createdAt: IsoDateTime;
}

export type ExclusionScope = 'source' | 'thread' | 'pattern' | 'role';

export interface ExclusionRule {
  id: Id;
  scope: ExclusionScope;
  sourceId: Id | null;
  threadId: Id | null;
  pattern: string | null;
  role: EntryRole | null;
  active: boolean;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Agenten, Jobs, KI-Aufrufe
// ---------------------------------------------------------------------------

export type AgentTask =
  | 'tagging'
  | 'summarize'
  | 'embed'
  | 'link'
  | 'folders'
  | 'stages'
  | 'notes_refresh'
  | 'resume_check';

export type RunStatus = 'estimated' | 'confirmed' | 'running' | 'paused' | 'done' | 'failed' | 'cancelled';

export interface RunEstimate {
  items: number;
  inputTokens: number;
  outputTokens: number;
  costUsdMicros: number;
}

export interface AgentRun {
  id: Id;
  task: AgentTask;
  params: Record<string, unknown>;
  status: RunStatus;
  estimate: RunEstimate | null;
  confirmedAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
  stats: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AgentLogLine {
  id: number;
  runId: Id | null;
  ts: IsoDateTime;
  level: LogLevel;
  message: string;
  data: Record<string, unknown> | null;
}

export type LlmProvider = 'anthropic' | 'openai' | 'google' | 'webllm' | 'none';

export interface LlmUsageSummary {
  monthStart: IsoDate;
  costUsdMicros: number;
  inputTokens: number;
  outputTokens: number;
  monthlyCapUsdMicros: number | null;
  capReached: boolean;
}

// ---------------------------------------------------------------------------
// Operationen (Rückgängig)
// ---------------------------------------------------------------------------

export interface Operation {
  opId: Id;
  type: string;
  actor: Actor;
  payload: Record<string, unknown>;
  inverse: Record<string, unknown>;
  createdAt: IsoDateTime;
  undoneAt: IsoDateTime | null;
  undoOf: Id | null;
}

export interface OpResult {
  opId: Id;
  undoable: boolean;
  /** Kurze deutsche Meldung für die Oberfläche, z. B. "Korrektur gespeichert". */
  message: string;
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

export type ThemeId = 'hell' | 'dunkel' | 'papier' | 'nacht' | 'wald' | 'kontrast';
export type PaletteId = 'glut' | 'tiefsee' | 'graustufen' | 'moos' | 'sonnenaufgang' | 'polar' | 'beere';

export interface AppSettings {
  theme: ThemeId | 'system';
  palette: PaletteId;
  llm: {
    provider: LlmProvider;
    model: string | null;
    embeddingModel: string | null;
    monthlyCapUsdMicros: number | null;
  };
  privacy: {
    redactBeforeSend: true; // nicht abschaltbar
    previewBeforeSend: boolean;
  };
  backup: {
    reminderDays: number;
    lastBackupAt: IsoDateTime | null;
  };
  lock: {
    method: 'passkey' | 'passphrase' | 'none';
    autoLockMinutes: number;
  };
}
