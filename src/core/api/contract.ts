/**
 * Denkspur – Vertrag der internen API.
 *
 * Alles, was Daten liest oder schreibt (Oberfläche, Befehlsfeld, Archiv-Chat, Agenten,
 * Importer), läuft über diese Schnittstelle. Die Implementierung lebt im DB-Worker
 * (src/core/db/worker.ts) und wird im Haupt-Thread über Comlink angesprochen
 * (src/core/api/client.ts). Die Oberfläche greift nie direkt auf SQL zu.
 *
 * Meilenstein-Markierung: [M0] … [M8] = ab wann die Methode implementiert sein muss.
 * Methoden späterer Meilensteine dürfen vorher `throw new NotImplemented(...)` werfen.
 */

import type {
  AgentLogLine,
  AgentRun,
  AgentTask,
  AppSettings,
  Derived,
  Entry,
  EntryRole,
  EntryVersion,
  ExclusionRule,
  Folder,
  Id,
  IsoDate,
  IsoDateTime,
  LlmUsageSummary,
  Note,
  NoteVersion,
  Operation,
  OpResult,
  RunEstimate,
  Source,
  SourceDecision,
  SourceKind,
  Stage,
  Tag,
  TagSchema,
  TargetRef,
  Thread,
  WhoseWords,
} from '../model/types';

// ---------------------------------------------------------------------------
// Gemeinsame Hilfstypen
// ---------------------------------------------------------------------------

/** Globaler Filter – der Zeitraum gilt für alle Ansichten. */
export interface RecordFilter {
  from?: IsoDateTime;
  to?: IsoDateTime;
  sourceIds?: Id[];
  tagIds?: Id[];
  folderIds?: Id[];
  roles?: EntryRole[];
  /** Freitext (FTS5-Syntax erlaubt). */
  text?: string;
}

export interface Page {
  limit?: number; // Standard 50
  offset?: number;
}

export interface Diagnostics {
  sqliteVersion: string;
  fts5: boolean;
  vfs: string; // z. B. "opfs-sahpool" oder "memory"
  persisted: boolean; // navigator.storage.persisted()
  quotaBytes: number | null;
  usageBytes: number | null;
  standalone: boolean; // als Home-Bildschirm-App gestartet
  webgpu: boolean;
  passkeyPrf: boolean | 'unknown';
  userAgent: string;
  schemaVersion: number;
}

export interface RecordStats {
  entries: number;
  threads: number;
  notes: number;
  sources: number;
  firstEntryAt: IsoDateTime | null;
  lastEntryAt: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportRequest {
  /** File-Objekte sind per structured clone an den Worker übertragbar. */
  file: File;
  /** Wenn leer: automatische Erkennung (ZIP-Inhalt, Dateiname, JSON-Struktur). */
  kind?: SourceKind;
  /** Bestehende Quelle wiederverwenden (z. B. zweiter ChatGPT-Export). */
  sourceId?: Id;
  whoseWords?: WhoseWords;
}

export interface ImportReport {
  importId: Id;
  sourceId: Id;
  kind: SourceKind;
  added: number;
  duplicates: number;
  skippedByRules: number;
  errors: { item: string; message: string }[];
  opId: Id;
}

export interface PasteRequest {
  text: string;
  createdAt?: IsoDateTime; // Standard: jetzt
  role?: EntryRole; // Standard: originator
  title?: string;
}

// ---------------------------------------------------------------------------
// Suche und Fragen
// ---------------------------------------------------------------------------

export interface SearchQuery extends RecordFilter, Page {
  scope?: ('entries' | 'notes' | 'threads' | 'folders' | 'tags')[];
}

export interface SearchHit {
  target: TargetRef | { type: 'folder' | 'tag'; id: Id };
  title: string;
  snippet: string; // mit <mark>…</mark> um Treffer
  at: IsoDateTime | null;
  score: number;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}

export interface AskAnswer {
  answer: string;
  /** Einträge, auf die sich die Antwort stützt – werden in der Oberfläche angezeigt. */
  citations: { entryId: Id; quote: string; at: IsoDateTime }[];
  usedLlm: boolean;
}

// ---------------------------------------------------------------------------
// Ansichtsdaten
// ---------------------------------------------------------------------------

export interface BrainPoint {
  id: Id;
  target: TargetRef;
  /** Position im Gehirn-Layout, normiert auf [-1, 1]. */
  x: number;
  y: number;
  z: number;
  group: string; // Ordner oder Haupt-Tag → Farbe
  label: string;
  /** true = Rohquelle (Stamm/Rückenmark), false = Notiz/Cluster (Gehirn). */
  isRaw: boolean;
  at: IsoDateTime | null;
}

export interface BrainData {
  points: BrainPoint[];
  groups: { id: string; label: string; count: number }[];
  edges: { from: Id; to: Id; type: 'wikilink' | 'computed' }[];
}

export interface TimelineData {
  buckets: { start: IsoDateTime; end: IsoDateTime; count: number; bySource: Record<Id, number> }[];
  events: { at: IsoDateTime; target: TargetRef; label: string }[];
}

export type TableProperty = 'month' | 'week' | 'source' | 'folder' | 'tag' | 'role' | 'kind' | 'stage';
export type TableForm = 'table' | 'heatmap' | 'bar' | 'stacked' | 'scatter' | 'line';

export interface TableSpec {
  x: TableProperty;
  y: TableProperty;
  filterBy?: { property: TableProperty; values: string[] };
  form: TableForm;
  filter?: RecordFilter;
}

export interface TableData {
  xValues: string[];
  yValues: string[];
  /** cells[yIndex][xIndex] = Anzahl */
  cells: number[][];
  spec: TableSpec;
}

export interface WavesSpec {
  topics: { kind: 'tag' | 'folder' | 'text'; value: string }[];
  bucket: 'week' | 'month';
  scale: 'absolute' | 'relative' | 'log';
  smoothing: number; // 0 = aus, sonst Fenstergröße in Buckets
  filter?: RecordFilter;
}

export interface WavesData {
  buckets: IsoDateTime[];
  series: { topic: string; values: number[] }[];
}

// ---------------------------------------------------------------------------
// Die API
// ---------------------------------------------------------------------------

export interface DenkspurApi {
  // --- System [M0] ---
  init(): Promise<{ schemaVersion: number; firstRun: boolean }>;
  diagnostics(): Promise<Diagnostics>;
  stats(filter?: RecordFilter): Promise<RecordStats>;
  loadDemoRecord(): Promise<OpResult>;
  /** Löscht den gesamten Record. Nur mit confirm === 'ALLES LOESCHEN'. */
  resetRecord(confirm: 'ALLES LOESCHEN'): Promise<void>;

  // --- Einstellungen [M0] ---
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;

  // --- Quellen und Import [M1] ---
  listSources(): Promise<Source[]>;
  setSourceDecision(sourceId: Id, decision: SourceDecision, whoseWords?: WhoseWords): Promise<OpResult>;
  importFile(req: ImportRequest): Promise<ImportReport>;
  importPaste(req: PasteRequest): Promise<ImportReport>;

  // --- Einträge und Fäden [M0 Lesen, M1 Rest] ---
  getEntry(id: Id): Promise<{ entry: Entry; versions: EntryVersion[]; derived: Derived[]; tags: Tag[] }>;
  listEntries(filter: RecordFilter & Page): Promise<{ items: Entry[]; total: number }>;
  getThread(id: Id): Promise<{ thread: Thread; entries: Entry[] }>;
  listThreads(filter: RecordFilter & Page): Promise<{ items: Thread[]; total: number }>;
  /** Antworten auf eine bestimmte Nachricht. */
  getReplies(entryId: Id): Promise<Entry[]>;
  /** Korrektur als neue Version – Original bleibt erhalten. */
  correctEntry(id: Id, newText: string, reason?: string): Promise<OpResult>;
  /** Faden oder Eintrag verschwindet aus Gehirn, Suche und Notizen. */
  markNotMine(target: TargetRef): Promise<OpResult>;

  // --- Suche [M0 einfach, M1 vollständig] ---
  search(q: SearchQuery): Promise<SearchResult>;
  /** Mit KI: Antwort mit Zitaten [M5]. Ohne KI: beste Treffer + frühester Treffer [M1]. */
  ask(question: string, filter?: RecordFilter): Promise<AskAnswer>;
  /** "Wann hatte ich diese Idee zum ersten Mal?" */
  firstMention(textOrEntryId: string): Promise<{ entry: Entry; similar: Entry[] } | null>;

  // --- Notizen [M2] ---
  listNotes(filter?: RecordFilter & Page & { stage?: Stage; author?: 'user' | 'agent' }): Promise<{ items: Note[]; total: number }>;
  getNote(id: Id): Promise<{ note: Note; versions: NoteVersion[]; derived: Derived[]; backlinks: TargetRef[] }>;
  createNote(input: { title: string; bodyMd?: string; folderId?: Id }): Promise<{ note: Note; op: OpResult }>;
  updateNote(id: Id, bodyMd: string, reason?: string): Promise<OpResult>;
  appendToDaily(text: string, date?: IsoDate): Promise<OpResult>;
  resolveWikilink(title: string): Promise<Note | null>;
  exportVault(): Promise<Blob>; // ZIP, Obsidian-kompatibel

  // --- Ordner und Tags [M1 Grundfunktionen, M3 Agenten-Vorschläge] ---
  listFolders(): Promise<Folder[]>;
  createFolder(name: string, parentId?: Id): Promise<{ folder: Folder; op: OpResult }>;
  addToFolder(folderId: Id, targets: TargetRef[]): Promise<OpResult>;
  /** Zusammenführen ohne Neuablage (merged_into). */
  mergeFolders(sourceFolderId: Id, intoFolderId: Id): Promise<OpResult>;
  listTags(): Promise<Tag[]>;
  addTag(target: TargetRef, name: string): Promise<OpResult>;
  removeTag(target: TargetRef, tagId: Id): Promise<OpResult>;

  // --- Ausschlussregeln [M1] ---
  listExclusionRules(): Promise<ExclusionRule[]>;
  addExclusionRule(rule: Omit<ExclusionRule, 'id' | 'createdAt' | 'active'>): Promise<OpResult>;
  removeExclusionRule(id: Id): Promise<OpResult>;

  // --- Abgeleitetes [M3] ---
  listDerived(target: TargetRef): Promise<Derived[]>;
  acceptDerived(id: Id): Promise<OpResult>;
  rejectDerived(id: Id): Promise<OpResult>;

  // --- Ansichten [M4] ---
  brain(filter?: RecordFilter): Promise<BrainData>;
  timeline(filter?: RecordFilter): Promise<TimelineData>;
  table(spec: TableSpec): Promise<TableData>;
  waves(spec: WavesSpec): Promise<WavesData>;

  // --- Rückgängig [M1] ---
  listOperations(limit?: number): Promise<Operation[]>;
  /** Ohne opId: letzte rückgängig machbare Operation. */
  undo(opId?: Id): Promise<OpResult>;

  // --- Agenten [M3] ---
  listTagSchemas(): Promise<TagSchema[]>;
  saveTagSchema(schema: Omit<TagSchema, 'id' | 'createdAt'> & { id?: Id }): Promise<TagSchema>;
  /** Schätzt Umfang, Tokens und Kosten. Startet NICHTS. */
  estimateRun(task: AgentTask, params: Record<string, unknown>, filter?: RecordFilter): Promise<{ run: AgentRun; estimate: RunEstimate }>;
  /** Erst nach Bestätigung durch mich. */
  confirmRun(runId: Id): Promise<AgentRun>;
  pauseRun(runId: Id): Promise<AgentRun>;
  resumeRun(runId: Id): Promise<AgentRun>;
  cancelRun(runId: Id): Promise<AgentRun>;
  listRuns(limit?: number): Promise<AgentRun[]>;
  compareRuns(runA: Id, runB: Id): Promise<{ onlyA: number; onlyB: number; both: number; examples: unknown[] }>;
  agentLog(sinceId?: number, runId?: Id): Promise<AgentLogLine[]>;
  llmUsage(): Promise<LlmUsageSummary>;

  // --- Befehlsfeld und Archiv-Chat [M5] ---
  /**
   * Natürliche Sprache → Tool-Calls über diese API. Mit KI: Tool-Calling im Worker
   * (API-Keys verlassen den Worker nie). Ohne KI: regelbasierter Fallback.
   * Schreibende Aktionen und Datenversand brauchen eine Bestätigung → needsConfirmation;
   * dann erneut mit confirmToken aufrufen.
   */
  command(input: string, context: CommandContext, confirmToken?: string): Promise<CommandResult>;
  chat(chatId: Id | null, message: string, context: CommandContext, confirmToken?: string): Promise<CommandResult & { chatId: Id }>;

  // --- Sicherheit und Backup [M6] ---
  exportBackup(passphrase: string): Promise<Blob>; // .denkspur-Datei, AES-GCM
  importBackup(file: File, passphrase: string): Promise<RecordStats>;
  createTimestamp(): Promise<OpResult>; // nur nach Zustimmung (consents)
}

// ---------------------------------------------------------------------------
// Befehle
// ---------------------------------------------------------------------------

export interface CommandContext {
  view: ViewName;
  filter: RecordFilter;
  selection: TargetRef[];
}

/** Aktionen, die der Worker der Oberfläche zurückgibt (werden über UiCommands ausgeführt). */
export type UiAction =
  | { type: 'openView'; view: ViewName; params?: Record<string, unknown> }
  | { type: 'setTimeRange'; from: IsoDateTime | null; to: IsoDateTime | null }
  | { type: 'highlight'; targets: TargetRef[] }
  | { type: 'openDetail'; target: TargetRef };

export interface CommandResult {
  reply: string;
  uiActions: UiAction[];
  ops: OpResult[];
  citations: AskAnswer['citations'];
  /** Gesetzt, wenn vor dem Ausführen oder Senden meine Zustimmung nötig ist. */
  needsConfirmation?: {
    summary: string; // z. B. "Ordner ‚Bienen-Projekt' in ‚Facharbeit' zusammenführen"
    outgoingPreview?: string; // was nach dem Datenschutzfilter an den KI-Anbieter ginge
    token: string;
  };
  usedLlm: boolean;
}

/**
 * Befehle, die nur die Oberfläche betreffen (kein Datenzugriff).
 * Werden vom Befehls-Router und vom Archiv-Chat als Tools genutzt [M5].
 */
export type ViewName =
  | 'gehirn'
  | 'zeitleiste'
  | 'notizen'
  | 'faeden'
  | 'ordner'
  | 'tabellen'
  | 'themenverlauf'
  | 'chat'
  | 'protokoll'
  | 'quellen'
  | 'einstellungen'
  | 'diagnose';

export interface UiCommands {
  openView(view: ViewName, params?: Record<string, unknown>): void;
  setTimeRange(from: IsoDateTime | null, to: IsoDateTime | null): void;
  highlight(targets: TargetRef[]): void;
  openDetail(target: TargetRef): void;
  showToast(message: string, undoOpId?: Id): void;
}
