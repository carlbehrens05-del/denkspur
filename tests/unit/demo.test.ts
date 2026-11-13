import { describe, expect, it } from 'vitest';
import { countDemoEntries, DEMO_SEED, generateDemoRecord } from '../../src/demo/generator';
import { memoryApi } from './helpers';

function allEntryTexts() {
  const r = generateDemoRecord();
  return [
    ...r.threads.flatMap((t) => t.entries.map((e) => ({ ...e, thread: t.title, source: t.source }))),
    ...r.loose.map((e) => ({ ...e, thread: null })),
  ];
}

describe('Demo-Generator', () => {
  it('ist deterministisch', () => {
    expect(generateDemoRecord(DEMO_SEED)).toEqual(generateDemoRecord(DEMO_SEED));
    expect(generateDemoRecord(1)).not.toEqual(generateDemoRecord(2));
  });

  it('hat die Größenordnung aus der Spezifikation', () => {
    const r = generateDemoRecord();
    expect(r.threads).toHaveLength(25);
    expect(r.notes).toHaveLength(40);
    const n = countDemoEntries(r);
    expect(n).toBeGreaterThanOrEqual(270);
    expect(n).toBeLessThanOrEqual(330);
  });

  it('liegt im Zeitraum 01.03.–31.10.2026', () => {
    for (const e of allEntryTexts()) {
      expect(e.at >= '2026-03-01').toBe(true);
      expect(e.at <= '2026-10-31T23:59').toBe(true);
    }
  });

  it('enthält die Bienentränke genau 4×, zuerst am 12.04.2026', () => {
    const hits = allEntryTexts()
      .filter((e) => /Bienentränke/.test(e.text))
      .sort((a, b) => a.at.localeCompare(b.at));
    expect(hits).toHaveLength(4);
    expect(hits[0]?.at.slice(0, 10)).toBe('2026-04-12');
    expect(hits[0]?.text).toMatch(/solarbetriebene Bienentränke/);
  });

  it('enthält genau einen Eintrag mit „4.000 Wildbienen“', () => {
    expect(allEntryTexts().filter((e) => e.text.includes('4.000 Wildbienen'))).toHaveLength(1);
  });

  it('belegt Python und Praktikum, aber nicht die Robotik-AG', () => {
    const texts = allEntryTexts().map((e) => e.text);
    expect(texts.some((t) => t.includes('Python'))).toBe(true);
    expect(texts.some((t) => t.includes('Praktikum'))).toBe(true);
    expect(texts.some((t) => /Robotik/.test(t))).toBe(false);
    const cv = generateDemoRecord().notes.find((n) => n.title === 'Lebenslauf');
    expect(cv?.bodyMd).toMatch(/Robotik-AG/);
  });

  it('hat einen Faden mit eingefügtem Chat eines Freundes und Assistenten-Antworten', () => {
    const r = generateDemoRecord();
    const pasted = r.threads.find((t) => t.title.startsWith('Eingefügt:'));
    expect(pasted?.entries.some((e) => e.text.includes('Malte'))).toBe(true);
    const roles = new Set(r.threads.flatMap((t) => t.entries.map((e) => e.role)));
    expect(roles).toEqual(new Set(['originator', 'assistant', 'other']));
  });

  it('enthält Umlaute und ß', () => {
    const texts = allEntryTexts()
      .map((e) => e.text)
      .join(' ');
    expect(texts).toMatch(/über/);
    expect(texts).toMatch(/Größe/);
  });

  it('Facharbeit-Schwerpunkt liegt im Frühjahr', () => {
    const r = generateDemoRecord();
    const fa = r.threads.filter((t) => t.folders.includes('facharbeit'));
    expect(fa.length).toBeGreaterThanOrEqual(6);
    for (const t of fa) expect(t.startedAt >= '2026-03-01' && t.startedAt < '2026-06-01').toBe(true);
  });
});

describe('Demo-Archiv über die API', () => {
  it('lädt, ist durchsuchbar und ein zweites Laden erzeugt nur Duplikate', async () => {
    const api = await memoryApi();
    const init = await api.init();
    expect(init).toEqual({ schemaVersion: 1, firstRun: true });

    const first = await api.loadDemoRecord();
    expect(first.message).toMatch(/Demo-Archiv geladen/);
    const s = await api.stats();
    expect(s.entries).toBe(countDemoEntries(generateDemoRecord()));
    expect(s.threads).toBe(25);
    expect(s.notes).toBe(40);
    expect(s.sources).toBe(5);
    expect(s.firstEntryAt?.slice(0, 7)).toBe('2026-03');

    const second = await api.loadDemoRecord();
    expect(second.message).toMatch(/0 neu/);
    expect((await api.stats()).entries).toBe(s.entries);
    expect(await api.listSources()).toHaveLength(5);
  });

  it('Suche „Facharbeit“ findet Einträge und Notizen, „uber“ findet „über“', async () => {
    const api = await memoryApi();
    await api.loadDemoRecord();
    const fa = await api.search({ text: 'Facharbeit' });
    expect(fa.total).toBeGreaterThan(10);
    expect(fa.hits.some((h) => h.target.type === 'entry')).toBe(true);
    expect((await api.search({ text: 'Facharbeit', scope: ['notes'] })).total).toBeGreaterThan(0);
    const uber = await api.search({ text: 'uber' });
    expect(uber.total).toBeGreaterThan(0);
    expect(uber.hits.some((h) => /<mark>über<\/mark>/i.test(h.snippet))).toBe(true);
  });

  it('Korrektur „4.000 → 400“ und Rückgängig', async () => {
    const api = await memoryApi();
    await api.loadDemoRecord();
    const hit = (await api.search({ text: '"4.000"' })).hits[0];
    expect(hit).toBeDefined();
    const id = hit?.target.id as string;
    const { entry } = await api.getEntry(id);
    const res = await api.correctEntry(id, entry.text.replace('4.000', '400'), 'gemeint war 400');
    const after = await api.getEntry(id);
    expect(after.entry.text).toContain('etwa 400 Wildbienen');
    expect(after.entry.originalText).toContain('4.000 Wildbienen');
    expect(after.versions).toHaveLength(1);
    await api.undo(res.opId);
    expect((await api.getEntry(id)).entry.text).toContain('4.000 Wildbienen');
  });

  it('Gespräch „nicht von mir“ verschwindet aus der Suche', async () => {
    const api = await memoryApi();
    await api.loadDemoRecord();
    const hit = (await api.search({ text: 'Malte Gitarre' })).hits[0];
    const { entry } = await api.getEntry(hit?.target.id as string);
    const res = await api.markNotMine({ type: 'thread', id: entry.threadId as string });
    expect((await api.search({ text: 'Malte Gitarre' })).total).toBe(0);
    await api.undo(res.opId);
    expect((await api.search({ text: 'Malte Gitarre' })).total).toBeGreaterThan(0);
  });

  it('Rückgängig des Demo-Imports blendet alles aus', async () => {
    const api = await memoryApi();
    const res = await api.loadDemoRecord();
    await api.undo(res.opId);
    const s = await api.stats();
    expect(s.entries).toBe(0);
    expect(s.notes).toBe(0);
  });

  it('Faden und Antworten lesen', async () => {
    const api = await memoryApi();
    await api.loadDemoRecord();
    const { items } = await api.listThreads({ limit: 100 });
    expect(items).toHaveLength(25);
    const t = await api.getThread(items[0]?.id as string);
    expect(t.entries.length).toBeGreaterThan(3);
    const replies = await api.getReplies(t.entries[0]?.id as string);
    expect(replies).toHaveLength(1);
  });

  it('Diagnose meldet FTS5, Schema-Version und VFS', async () => {
    const api = await memoryApi();
    const d = await api.diagnostics();
    expect(d.fts5).toBe(true);
    expect(d.schemaVersion).toBe(1);
    expect(d.vfs).toBe('memory');
    expect(d.sqliteVersion).toMatch(/^3\./);
  });

  it('Zurücksetzen nur mit Bestätigung, danach ist alles leer', async () => {
    const api = await memoryApi();
    await api.loadDemoRecord();
    await expect(api.resetRecord('nein' as 'ALLES LOESCHEN')).rejects.toThrow(/ALLES LOESCHEN/);
    await api.resetRecord('ALLES LOESCHEN');
    expect((await api.stats()).entries).toBe(0);
  });

  it('Methoden späterer Meilensteine werfen NotImplemented', async () => {
    const api = await memoryApi();
    await expect(api.brain()).rejects.toMatchObject({ name: 'NotImplemented' });
    await expect(api.command('hallo', { view: 'gehirn', filter: {}, selection: [] })).rejects.toThrow(/M5/);
  });
});
