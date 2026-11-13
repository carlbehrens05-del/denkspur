/**
 * Implementierung von DenkspurApi. Läuft im DB-Worker (und in Tests unter Node).
 * Methoden späterer Meilensteine werfen NotImplemented.
 */
import { loadDemo } from '../../demo/load';
import type { Db } from '../db/types';
import { migrate } from '../db/migrate';
import type { Derived, Entry, Id, Note, NoteVersion, OpResult, TargetRef } from '../model/types';
import type {
  BrainData,
  CommandContext,
  CommandResult,
  DenkspurApi,
  Diagnostics,
  Page,
  RecordFilter,
  RecordStats,
  SearchQuery,
  SearchResult,
  TableData,
  TimelineData,
  WavesData,
} from './contract';
import { DenkspurError, NotImplemented } from './errors';
import { createCtx, parseJson, type Ctx } from '../services/context';
import {
  correctEntry,
  findEntry,
  listEntries,
  listEntryTags,
  listReplies,
  listVersions,
  markEntryNotMine,
} from '../services/entries';
import { listOperations, undo } from '../services/operations';
import { search } from '../services/search';
import { getSettings, updateSettings } from '../services/settings';
import { listSources } from '../services/sources';
import { stats } from '../services/stats';
import { getThread, listThreads, markThreadNotMine } from '../services/threads';
import { undoRegistry } from '../services/undoRegistry';
import type { IdGenerator } from '../util/ids';
import type { Clock } from '../util/time';

/** Eine geöffnete Datenbank samt Herkunft (für die Diagnose). */
export interface OpenedDb {
  db: Db;
  /** "opfs-sahpool" oder "memory" */
  vfs: string;
  sqliteVersion: string;
  /** Gesetzt, wenn auf den Speicher ausgewichen wurde. */
  warning: string | null;
}

/** Öffnet und löscht die Datenbank – im Worker über OPFS, in Tests im Speicher. */
export interface DbHost {
  open(): Promise<OpenedDb>;
  /** Schließt die Datenbank, löscht die Datei und öffnet eine leere. */
  reset(current: OpenedDb): Promise<OpenedDb>;
}

interface State {
  opened: OpenedDb;
  ctx: Ctx;
  schemaVersion: number;
  firstRun: boolean;
}

interface DerivedRow {
  id: string;
  target_type: Derived['targetType'];
  target_id: string;
  kind: Derived['kind'];
  payload: string;
  provenance: string;
  run_id: string | null;
  model: string | null;
  status: Derived['status'];
  created_at: string;
}

function mapDerived(r: DerivedRow): Derived {
  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    kind: r.kind,
    payload: parseJson<Record<string, unknown>>(r.payload, {}),
    provenance: parseJson<Id[]>(r.provenance, []),
    runId: r.run_id,
    model: r.model,
    status: r.status,
    createdAt: r.created_at,
  };
}

export class DenkspurApiImpl implements DenkspurApi {
  private state: Promise<State> | null = null;

  constructor(
    private readonly host: DbHost,
    private readonly clock?: Clock,
    private readonly ids?: IdGenerator,
  ) {}

  private async ready(): Promise<Ctx> {
    return (await this.boot()).ctx;
  }

  private boot(): Promise<State> {
    if (!this.state) {
      this.state = this.host.open().then((opened) => this.prepare(opened));
      this.state.catch(() => {
        this.state = null;
      });
    }
    return this.state;
  }

  private prepare(opened: OpenedDb): State {
    const { from, to } = migrate(opened.db);
    return {
      opened,
      ctx: createCtx(opened.db, this.clock, this.ids),
      schemaVersion: to,
      firstRun: from === 0,
    };
  }

  // --- System ---------------------------------------------------------------

  async init(): Promise<{ schemaVersion: number; firstRun: boolean }> {
    const s = await this.boot();
    return { schemaVersion: s.schemaVersion, firstRun: s.firstRun };
  }

  async diagnostics(): Promise<Diagnostics> {
    const s = await this.boot();
    const db = s.ctx.db;
    let fts5: boolean;
    try {
      const opt = db.get<{ v: number }>("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS v");
      db.get("SELECT count(*) FROM search_index WHERE search_index MATCH 'diagnose'");
      fts5 = opt?.v === 1;
    } catch {
      fts5 = false;
    }
    const nav = (globalThis as { navigator?: Navigator }).navigator;
    let persisted = false;
    let quotaBytes: number | null = null;
    let usageBytes: number | null = null;
    try {
      if (nav?.storage?.persisted) persisted = await nav.storage.persisted();
      if (nav?.storage?.estimate) {
        const est = await nav.storage.estimate();
        quotaBytes = est.quota ?? null;
        usageBytes = est.usage ?? null;
      }
    } catch {
      // Im Worker nicht überall verfügbar – der Client ergänzt die Werte.
    }
    return {
      sqliteVersion: s.opened.sqliteVersion,
      fts5,
      vfs: s.opened.vfs,
      persisted,
      quotaBytes,
      usageBytes,
      standalone: false, // ergänzt der Haupt-Thread (client.ts)
      webgpu: Boolean(nav && 'gpu' in nav),
      passkeyPrf: 'unknown', // ergänzt der Haupt-Thread
      userAgent: nav?.userAgent ?? 'unbekannt',
      schemaVersion: s.schemaVersion,
    };
  }

  /** Zusätzliche Info für die Oberfläche: Warnung beim Speicher-Fallback. */
  async storageWarning(): Promise<string | null> {
    return (await this.boot()).opened.warning;
  }

  async stats(filter?: RecordFilter): Promise<RecordStats> {
    return stats(await this.ready(), filter);
  }

  async loadDemoRecord(): Promise<OpResult> {
    const r = loadDemo(await this.ready());
    return { opId: r.opId, undoable: r.undoable, message: r.message };
  }

  async resetRecord(confirm: 'ALLES LOESCHEN'): Promise<void> {
    if (confirm !== 'ALLES LOESCHEN') throw new DenkspurError('Zum Löschen bitte „ALLES LOESCHEN“ eingeben.');
    const s = await this.boot();
    const fresh = await this.host.reset(s.opened);
    this.state = Promise.resolve(this.prepare(fresh));
    await this.state;
  }

  // --- Einstellungen --------------------------------------------------------

  async getSettings() {
    return getSettings(await this.ready());
  }

  async updateSettings(patch: Parameters<DenkspurApi['updateSettings']>[0]) {
    return updateSettings(await this.ready(), patch).settings;
  }

  // --- Quellen und Import ---------------------------------------------------

  async listSources() {
    return listSources(await this.ready());
  }

  async setSourceDecision(): Promise<OpResult> {
    throw new NotImplemented('setSourceDecision', 'M1');
  }

  async importFile(): Promise<never> {
    throw new NotImplemented('importFile', 'M1');
  }

  async importPaste(): Promise<never> {
    throw new NotImplemented('importPaste', 'M1');
  }

  // --- Einträge und Fäden ---------------------------------------------------

  async getEntry(id: Id) {
    const ctx = await this.ready();
    const entry = findEntry(ctx, id);
    if (!entry) throw new DenkspurError('Eintrag nicht gefunden.');
    const derived = ctx.db
      .all<DerivedRow>(
        "SELECT * FROM derived WHERE target_type = 'entry' AND target_id = ? ORDER BY created_at",
        [id],
      )
      .map(mapDerived);
    return { entry, versions: listVersions(ctx, id), derived, tags: listEntryTags(ctx, id) };
  }

  async listEntries(filter: RecordFilter & Page) {
    return listEntries(await this.ready(), filter);
  }

  async getThread(id: Id) {
    return getThread(await this.ready(), id);
  }

  async listThreads(filter: RecordFilter & Page) {
    return listThreads(await this.ready(), filter);
  }

  async getReplies(entryId: Id): Promise<Entry[]> {
    return listReplies(await this.ready(), entryId);
  }

  async correctEntry(id: Id, newText: string, reason?: string): Promise<OpResult> {
    return correctEntry(await this.ready(), id, newText, reason);
  }

  async markNotMine(target: TargetRef): Promise<OpResult> {
    const ctx = await this.ready();
    if (target.type === 'thread') return markThreadNotMine(ctx, target.id);
    if (target.type === 'entry') return markEntryNotMine(ctx, target.id);
    throw new DenkspurError('Notizen lassen sich nicht als „nicht von mir“ markieren.');
  }

  // --- Suche ----------------------------------------------------------------

  async search(q: SearchQuery): Promise<SearchResult> {
    return search(await this.ready(), q);
  }

  async ask(): Promise<never> {
    throw new NotImplemented('ask', 'M1');
  }

  async firstMention(): Promise<never> {
    throw new NotImplemented('firstMention', 'M1');
  }

  // --- Notizen (Lesen vorgezogen für die Trefferanzeige, Rest M2) ------------

  async listNotes(): Promise<never> {
    throw new NotImplemented('listNotes', 'M2');
  }

  async getNote(
    id: Id,
  ): Promise<{ note: Note; versions: NoteVersion[]; derived: Derived[]; backlinks: TargetRef[] }> {
    const ctx = await this.ready();
    const row = ctx.db.get<{
      id: string;
      path: string;
      title: string;
      author: Note['author'];
      stage: Note['stage'];
      is_daily: number;
      daily_date: string | null;
      current_version: number;
      source_entry_id: string | null;
      archived: number;
      body_md: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM notes_current WHERE id = ?', [id]);
    if (!row) throw new DenkspurError('Notiz nicht gefunden.');
    const note: Note = {
      id: row.id,
      path: row.path,
      title: row.title,
      author: row.author,
      stage: row.stage,
      isDaily: Boolean(row.is_daily),
      dailyDate: row.daily_date,
      currentVersion: row.current_version,
      sourceEntryId: row.source_entry_id,
      archived: Boolean(row.archived),
      bodyMd: row.body_md,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    const versions = ctx.db
      .all<{
        note_id: string;
        version: number;
        body_md: string;
        created_at: string;
        actor: 'user' | 'agent';
        reason: string | null;
        op_id: string | null;
      }>('SELECT * FROM note_versions WHERE note_id = ? ORDER BY version', [id])
      .map((v) => ({
        noteId: v.note_id,
        version: v.version,
        bodyMd: v.body_md,
        createdAt: v.created_at,
        actor: v.actor,
        reason: v.reason,
        opId: v.op_id,
      }));
    return { note, versions, derived: [], backlinks: [] };
  }

  async createNote(): Promise<never> {
    throw new NotImplemented('createNote', 'M2');
  }

  async updateNote(): Promise<never> {
    throw new NotImplemented('updateNote', 'M2');
  }

  async appendToDaily(): Promise<never> {
    throw new NotImplemented('appendToDaily', 'M2');
  }

  async resolveWikilink(): Promise<never> {
    throw new NotImplemented('resolveWikilink', 'M2');
  }

  async exportVault(): Promise<never> {
    throw new NotImplemented('exportVault', 'M2');
  }

  // --- Ordner und Tags [M1] -------------------------------------------------

  async listFolders(): Promise<never> {
    throw new NotImplemented('listFolders', 'M1');
  }

  async createFolder(): Promise<never> {
    throw new NotImplemented('createFolder', 'M1');
  }

  async addToFolder(): Promise<never> {
    throw new NotImplemented('addToFolder', 'M1');
  }

  async mergeFolders(): Promise<never> {
    throw new NotImplemented('mergeFolders', 'M1');
  }

  async listTags(): Promise<never> {
    throw new NotImplemented('listTags', 'M1');
  }

  async addTag(): Promise<never> {
    throw new NotImplemented('addTag', 'M1');
  }

  async removeTag(): Promise<never> {
    throw new NotImplemented('removeTag', 'M1');
  }

  // --- Ausschlussregeln [M1] ------------------------------------------------

  async listExclusionRules(): Promise<never> {
    throw new NotImplemented('listExclusionRules', 'M1');
  }

  async addExclusionRule(): Promise<never> {
    throw new NotImplemented('addExclusionRule', 'M1');
  }

  async removeExclusionRule(): Promise<never> {
    throw new NotImplemented('removeExclusionRule', 'M1');
  }

  // --- Abgeleitetes [M3] ----------------------------------------------------

  async listDerived(): Promise<never> {
    throw new NotImplemented('listDerived', 'M3');
  }

  async acceptDerived(): Promise<never> {
    throw new NotImplemented('acceptDerived', 'M3');
  }

  async rejectDerived(): Promise<never> {
    throw new NotImplemented('rejectDerived', 'M3');
  }

  // --- Ansichten [M4] -------------------------------------------------------

  async brain(): Promise<BrainData> {
    throw new NotImplemented('brain', 'M4');
  }

  async timeline(): Promise<TimelineData> {
    throw new NotImplemented('timeline', 'M4');
  }

  async table(): Promise<TableData> {
    throw new NotImplemented('table', 'M4');
  }

  async waves(): Promise<WavesData> {
    throw new NotImplemented('waves', 'M4');
  }

  // --- Rückgängig (vorgezogen aus M1 für den Toast) -------------------------

  async listOperations(limit?: number) {
    return listOperations(await this.ready(), limit);
  }

  async undo(opId?: Id): Promise<OpResult> {
    return undo(await this.ready(), undoRegistry, opId);
  }

  // --- Agenten [M3] ---------------------------------------------------------

  async listTagSchemas(): Promise<never> {
    throw new NotImplemented('listTagSchemas', 'M3');
  }

  async saveTagSchema(): Promise<never> {
    throw new NotImplemented('saveTagSchema', 'M3');
  }

  async estimateRun(): Promise<never> {
    throw new NotImplemented('estimateRun', 'M3');
  }

  async confirmRun(): Promise<never> {
    throw new NotImplemented('confirmRun', 'M3');
  }

  async pauseRun(): Promise<never> {
    throw new NotImplemented('pauseRun', 'M3');
  }

  async resumeRun(): Promise<never> {
    throw new NotImplemented('resumeRun', 'M3');
  }

  async cancelRun(): Promise<never> {
    throw new NotImplemented('cancelRun', 'M3');
  }

  async listRuns(): Promise<never> {
    throw new NotImplemented('listRuns', 'M3');
  }

  async compareRuns(): Promise<never> {
    throw new NotImplemented('compareRuns', 'M3');
  }

  async agentLog(): Promise<never> {
    throw new NotImplemented('agentLog', 'M3');
  }

  async llmUsage(): Promise<never> {
    throw new NotImplemented('llmUsage', 'M3');
  }

  // --- Befehle und Chat [M5] ------------------------------------------------

  async command(_input: string, _context: CommandContext): Promise<CommandResult> {
    throw new NotImplemented('command', 'M5');
  }

  async chat(): Promise<never> {
    throw new NotImplemented('chat', 'M5');
  }

  // --- Sicherheit und Backup [M6] -------------------------------------------

  async exportBackup(): Promise<never> {
    throw new NotImplemented('exportBackup', 'M6');
  }

  async importBackup(): Promise<never> {
    throw new NotImplemented('importBackup', 'M6');
  }

  async createTimestamp(): Promise<never> {
    throw new NotImplemented('createTimestamp', 'M6');
  }
}

/** Zusatzmethoden der Implementierung, die nicht im Vertrag stehen (nur Oberfläche). */
export interface DenkspurApiExtras {
  storageWarning(): Promise<string | null>;
}
