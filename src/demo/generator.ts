/**
 * Deterministischer Generator für das erfundene Demo-Archiv (Jonas Brandt, 01.03.–31.10.2026).
 * Gleicher Seed → exakt gleiche Daten. Erzeugt nur Daten, schreibt nichts.
 */
import type { EntryKind, EntryRole, WhoseWords } from '../core/model/types';
import { seededRandom, type RandomSource } from '../core/util/ids';
import { berlinToIso } from '../core/util/time';
import {
  ALLGEMEIN_PAIRS,
  ANHAENGER_PAIRS,
  BEWERBUNG_PAIRS,
  DAILY_NOTES,
  FACHARBEIT_PAIRS,
  FOLLOW_UP_PAIRS,
  JOTTINGS,
  NOTES,
  PAIR_4000_WILDBIENEN,
  PAIR_BEWERBUNG_BELEGE,
  PAIR_BIENENTRAENKE_IDEE,
  PAIRS_MALTE,
  PAIRS_PYTHON,
  PAIRS_SOLARPUMPE,
  REPEAT_PREFIXES,
  VOICE_MEMOS,
  WHATSAPP_FAMILIE,
  WHATSAPP_LERNGRUPPE,
  WHATSAPP_OPA,
  type ChatLine,
  type FolderKey,
  type Loose,
  type Pair,
} from './content';

export const DEMO_SEED = 20260301;

export type DemoSourceKey = 'chatgpt' | 'claude' | 'notizen' | 'sprachmemos' | 'whatsapp';

export interface DemoSource {
  key: DemoSourceKey;
  label: string;
  whoseWords: WhoseWords;
}

export const DEMO_SOURCES: readonly DemoSource[] = [
  { key: 'chatgpt', label: 'ChatGPT (Demo)', whoseWords: 'mine' },
  { key: 'claude', label: 'Claude (Demo)', whoseWords: 'mine' },
  { key: 'notizen', label: 'Notizen (Demo)', whoseWords: 'mine' },
  { key: 'sprachmemos', label: 'Sprachmemos (Demo)', whoseWords: 'mine' },
  { key: 'whatsapp', label: 'WhatsApp (Demo)', whoseWords: 'mixed' },
];

export const DEMO_FOLDERS: readonly { key: FolderKey; name: string }[] = [
  { key: 'facharbeit', name: 'Facharbeit' },
  { key: 'bienen', name: 'Bienen-Projekt' },
];

export interface DemoEntry {
  externalId: string;
  at: string;
  role: EntryRole;
  kind: EntryKind;
  text: string;
  /** externalId des Eintrags, auf den geantwortet wird. */
  parentExternalId: string | null;
}

export interface DemoThread {
  externalId: string;
  source: DemoSourceKey;
  title: string;
  startedAt: string;
  entries: DemoEntry[];
  folders: FolderKey[];
}

export interface DemoLooseEntry extends DemoEntry {
  source: DemoSourceKey;
}

export interface DemoNote {
  path: string;
  title: string;
  bodyMd: string;
  createdAt: string;
  isDaily: boolean;
  dailyDate: string | null;
  folders: FolderKey[];
}

export interface DemoRecord {
  seed: number;
  threads: DemoThread[];
  loose: DemoLooseEntry[];
  notes: DemoNote[];
}

type Topic = 'facharbeit' | 'anhaenger' | 'bewerbung' | 'allgemein';

interface ThreadSpec {
  key: string;
  source: DemoSourceKey;
  date: string; // YYYY-MM-DD (Berliner Datum)
  title: string;
  topic?: Topic;
  /** Feste Paare am Anfang (Akzeptanztests). */
  fixed?: readonly Pair[];
  /** Anzahl zusätzlicher Paare aus dem Themen-Pool. */
  topicPairs?: number;
  /** Allgemeine Nachfragen anhängen (Standard: 1–2 zufällig). */
  followUps?: boolean;
  folders?: FolderKey[];
  /** WhatsApp-Verlauf statt KI-Chat. */
  chat?: readonly ChatLine[];
}

const THREADS: readonly ThreadSpec[] = [
  // Facharbeit (Schwerpunkt März–Mai)
  {
    key: 'f1',
    source: 'chatgpt',
    date: '2026-03-03',
    title: 'Themenfindung Facharbeit Biologie',
    topic: 'facharbeit',
    topicPairs: 4,
    folders: ['facharbeit'],
  },
  {
    key: 'f2',
    source: 'claude',
    date: '2026-03-10',
    title: 'Wildbienen im Stadtpark – Methodik',
    topic: 'facharbeit',
    topicPairs: 4,
    folders: ['facharbeit'],
  },
  {
    key: 'f3',
    source: 'chatgpt',
    date: '2026-03-18',
    title: 'Erste Zählung auswerten',
    topic: 'facharbeit',
    fixed: [PAIR_4000_WILDBIENEN],
    topicPairs: 3,
    folders: ['facharbeit'],
  },
  {
    key: 'f4',
    source: 'claude',
    date: '2026-03-29',
    title: 'Literatur zu Wildbienen',
    topic: 'facharbeit',
    topicPairs: 4,
    folders: ['facharbeit'],
  },
  {
    key: 'f5',
    source: 'claude',
    date: '2026-04-12',
    title: 'Zählung am Rosenbeet',
    topic: 'facharbeit',
    fixed: [PAIR_BIENENTRAENKE_IDEE],
    topicPairs: 3,
    folders: ['facharbeit', 'bienen'],
  },
  {
    key: 'f6',
    source: 'chatgpt',
    date: '2026-04-22',
    title: 'Zähldaten mit Python auswerten',
    topic: 'facharbeit',
    fixed: PAIRS_PYTHON,
    topicPairs: 2,
    folders: ['facharbeit'],
  },
  {
    key: 'f7',
    source: 'claude',
    date: '2026-05-08',
    title: 'Facharbeit: Gliederung und Fazit',
    topic: 'facharbeit',
    topicPairs: 4,
    folders: ['facharbeit'],
  },
  {
    key: 'f8',
    source: 'chatgpt',
    date: '2026-05-27',
    title: 'Präsentation der Facharbeit',
    topic: 'facharbeit',
    topicPairs: 4,
    folders: ['facharbeit'],
  },
  // Fahrradanhänger
  {
    key: 'a1',
    source: 'claude',
    date: '2026-05-16',
    title: 'Fahrradanhänger: Rahmen planen',
    topic: 'anhaenger',
    topicPairs: 4,
  },
  {
    key: 'a2',
    source: 'chatgpt',
    date: '2026-06-14',
    title: 'Anhängerkupplung selbst bauen',
    topic: 'anhaenger',
    topicPairs: 4,
  },
  {
    key: 'a3',
    source: 'claude',
    date: '2026-07-05',
    title: 'Räder und Achse für den Anhänger',
    topic: 'anhaenger',
    topicPairs: 4,
  },
  {
    key: 'a4',
    source: 'chatgpt',
    date: '2026-08-09',
    title: 'Anhänger wetterfest machen',
    topic: 'anhaenger',
    topicPairs: 4,
  },
  // Nebenjob-Bewerbung
  {
    key: 'b1',
    source: 'chatgpt',
    date: '2026-06-20',
    title: 'Nebenjob: Bewerbung Café Lindner',
    topic: 'bewerbung',
    fixed: [PAIR_BEWERBUNG_BELEGE],
    topicPairs: 3,
  },
  {
    key: 'b2',
    source: 'claude',
    date: '2026-07-12',
    title: 'Anschreiben überarbeiten',
    topic: 'bewerbung',
    topicPairs: 4,
  },
  {
    key: 'b3',
    source: 'chatgpt',
    date: '2026-08-24',
    title: 'Vorstellungsgespräch vorbereiten',
    topic: 'bewerbung',
    topicPairs: 4,
  },
  {
    key: 'b4',
    source: 'claude',
    date: '2026-09-07',
    title: 'Minijob-Regeln verstehen',
    topic: 'bewerbung',
    topicPairs: 4,
  },
  // Schule und Alltag
  {
    key: 'g1',
    source: 'chatgpt',
    date: '2026-03-22',
    title: 'Mathe-Abi: Integralrechnung',
    topic: 'allgemein',
    topicPairs: 4,
  },
  {
    key: 'g2',
    source: 'claude',
    date: '2026-06-28',
    title: 'Englisch: Essay über Social Media',
    topic: 'allgemein',
    topicPairs: 4,
  },
  {
    key: 'g3',
    source: 'chatgpt',
    date: '2026-08-02',
    title: 'Interrail-Reise planen',
    topic: 'allgemein',
    topicPairs: 4,
  },
  {
    key: 'g4',
    source: 'chatgpt',
    date: '2026-09-15',
    title: 'Solarpumpe dimensionieren',
    fixed: PAIRS_SOLARPUMPE,
    topicPairs: 0,
    folders: ['bienen'],
  },
  {
    key: 'g5',
    source: 'claude',
    date: '2026-10-18',
    title: 'Studienwahl: Biologie oder Umweltinformatik?',
    topic: 'allgemein',
    topicPairs: 4,
  },
  // Eingefügter Chat eines Freundes
  {
    key: 'p1',
    source: 'chatgpt',
    date: '2026-07-30',
    title: 'Eingefügt: Maltes Chat zum Gitarrenkauf',
    fixed: PAIRS_MALTE,
    topicPairs: 0,
    followUps: false,
  },
  // WhatsApp
  { key: 'w1', source: 'whatsapp', date: '2026-05-30', title: 'Opa Heinz', chat: WHATSAPP_OPA },
  { key: 'w2', source: 'whatsapp', date: '2026-04-05', title: 'Bio-Lerngruppe', chat: WHATSAPP_LERNGRUPPE },
  { key: 'w3', source: 'whatsapp', date: '2026-09-26', title: 'Familie Brandt', chat: WHATSAPP_FAMILIE },
];

const POOLS: Record<Topic, readonly Pair[]> = {
  facharbeit: FACHARBEIT_PAIRS,
  anhaenger: ANHAENGER_PAIRS,
  bewerbung: BEWERBUNG_PAIRS,
  allgemein: ALLGEMEIN_PAIRS,
};

function randInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(random: RandomSource, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Zieht Paare aus einem Pool; ist er erschöpft, wird neu gemischt und die Frage als Wiederholung markiert. */
class PairDeck {
  private queue: Pair[] = [];
  private round = 0;
  constructor(
    private readonly random: RandomSource,
    private readonly pool: readonly Pair[],
    /** Wiederholte Fragen mit „Noch mal kurz:“ o. Ä. kennzeichnen. */
    private readonly markRepeats = true,
  ) {}

  draw(exclude: Set<string>): Pair {
    for (let attempt = 0; attempt < this.pool.length * 2 + 2; attempt++) {
      if (this.queue.length === 0) {
        this.queue = shuffle(this.random, this.pool);
        this.round++;
      }
      const next = this.queue.shift() as Pair;
      if (exclude.has(next[0])) {
        this.queue.push(next);
        continue;
      }
      exclude.add(next[0]);
      if (this.round <= 1 || !this.markRepeats) return next;
      const prefix = REPEAT_PREFIXES[randInt(this.random, 0, REPEAT_PREFIXES.length - 1)] ?? '';
      return [`${prefix} ${lowerFirst(next[0])}`, next[1]];
    }
    throw new Error('demo: Pool zu klein');
  }
}

function lowerFirst(s: string): string {
  // Fragen mit „Ich“ bleiben groß, sonst wird der erste Buchstabe klein.
  return /^Ich\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

function parseDate(d: string): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y ?? 2026, m ?? 1, day ?? 1];
}

function minutesLater(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

export function generateDemoRecord(seed: number = DEMO_SEED): DemoRecord {
  const random = seededRandom(seed);
  const decks: Record<Topic, PairDeck> = {
    facharbeit: new PairDeck(random, POOLS.facharbeit),
    anhaenger: new PairDeck(random, POOLS.anhaenger),
    bewerbung: new PairDeck(random, POOLS.bewerbung),
    allgemein: new PairDeck(random, POOLS.allgemein),
  };
  const followUps = new PairDeck(random, FOLLOW_UP_PAIRS, false);

  const threads: DemoThread[] = THREADS.map((spec) => {
    const [y, m, d] = parseDate(spec.date);
    const startedAt = berlinToIso(y, m, d, randInt(random, 9, 19), randInt(random, 0, 59));
    const entries: DemoEntry[] = [];
    let at = startedAt;
    let prev: string | null = null;
    const push = (role: EntryRole, text: string, gap: number) => {
      at = entries.length === 0 ? at : minutesLater(at, gap);
      const externalId = `${spec.key}-${String(entries.length + 1).padStart(2, '0')}`;
      entries.push({ externalId, at, role, kind: 'message', text, parentExternalId: prev });
      prev = externalId;
    };

    if (spec.chat) {
      for (const [fromJonas, text] of spec.chat)
        push(fromJonas ? 'originator' : 'other', text, randInt(random, 1, 12));
    } else {
      const pairs: Pair[] = [...(spec.fixed ?? [])];
      const used = new Set(pairs.map((p) => p[0]));
      if (spec.topic)
        for (let i = 0; i < (spec.topicPairs ?? 0); i++) pairs.push(decks[spec.topic].draw(used));
      if (spec.followUps !== false) {
        const n = randInt(random, 1, 2);
        for (let i = 0; i < n; i++) pairs.push(followUps.draw(used));
      }
      for (const [user, assistant] of pairs) {
        push('originator', user, randInt(random, 2, 14));
        push('assistant', assistant, 1);
      }
    }
    return {
      externalId: spec.key,
      source: spec.source,
      title: spec.title,
      startedAt,
      entries,
      folders: spec.folders ?? [],
    };
  });

  const loose: DemoLooseEntry[] = [
    ...looseEntries(VOICE_MEMOS, 'sprachmemos', 'voice', 'sm'),
    ...looseEntries(JOTTINGS, 'notizen', 'note', 'nz'),
  ];

  const notes: DemoNote[] = [
    ...NOTES.map(([path, title, date, body, folders]) => {
      const [y, m, d] = parseDate(date);
      return {
        path,
        title,
        bodyMd: body,
        createdAt: berlinToIso(y, m, d, 20, 0),
        isDaily: false,
        dailyDate: null,
        folders: [...folders],
      };
    }),
    ...DAILY_NOTES.map(([date, body]) => {
      const [y, m, d] = parseDate(date);
      return {
        path: `Tagesnotizen/${date}.md`,
        title: date,
        bodyMd: `# ${date}\n\n${body}`,
        createdAt: berlinToIso(y, m, d, 22, 0),
        isDaily: true,
        dailyDate: date,
        folders: [],
      };
    }),
  ];

  return { seed, threads, loose, notes };
}

function looseEntries(
  items: readonly Loose[],
  source: DemoSourceKey,
  kind: EntryKind,
  prefix: string,
): DemoLooseEntry[] {
  return items.map(([date, time, text], i) => {
    const [y, m, d] = parseDate(date);
    const [hh, mm] = time.split(':').map(Number);
    return {
      externalId: `${prefix}-${String(i + 1).padStart(2, '0')}`,
      source,
      at: berlinToIso(y, m, d, hh ?? 12, mm ?? 0),
      role: 'originator',
      kind,
      text,
      parentExternalId: null,
    };
  });
}

/** Anzahl aller Einträge (für Tests und Anzeige). */
export function countDemoEntries(record: DemoRecord): number {
  return record.threads.reduce((n, t) => n + t.entries.length, 0) + record.loose.length;
}
