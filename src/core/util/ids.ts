/**
 * Zeitlich sortierbare IDs (ULID-Format: 26 Zeichen Crockford-Base32).
 * Die ersten 10 Zeichen kodieren die Millisekunden, der Rest ist zufällig.
 * Innerhalb derselben Millisekunde bleibt die Reihenfolge monoton.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;
const RAND_LEN = 16;

export type RandomSource = () => number; // [0, 1)

function encodeTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0 || ms > 2 ** 48 - 1) throw new Error('ids: ungültiger Zeitpunkt');
  let out = '';
  let rest = Math.floor(ms);
  for (let i = 0; i < TIME_LEN; i++) {
    out = ALPHABET.charAt(rest % 32) + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return (buf[0] ?? 0) / 2 ** 32;
}

function randomChars(random: RandomSource): number[] {
  const out: number[] = [];
  for (let i = 0; i < RAND_LEN; i++) out.push(Math.floor(random() * 32) % 32);
  return out;
}

/** Erhöht den Zufallsteil um 1 (für Monotonie innerhalb einer Millisekunde). */
function increment(chars: number[]): number[] {
  const next = [...chars];
  for (let i = next.length - 1; i >= 0; i--) {
    const c = next[i] ?? 0;
    if (c < 31) {
      next[i] = c + 1;
      return next;
    }
    next[i] = 0;
  }
  throw new Error('ids: Überlauf innerhalb einer Millisekunde');
}

export interface IdGenerator {
  /** Neue ID; `at` legt den Zeitanteil fest (Standard: jetzt). */
  (at?: number | string | Date): string;
}

export function createIdGenerator(
  random: RandomSource = cryptoRandom,
  now: () => number = Date.now,
): IdGenerator {
  let lastTime = -1;
  let lastRand: number[] = [];
  return (at) => {
    const ms =
      at === undefined
        ? now()
        : typeof at === 'number'
          ? at
          : at instanceof Date
            ? at.getTime()
            : Date.parse(at);
    let rand: number[];
    if (ms === lastTime) {
      rand = increment(lastRand);
    } else {
      rand = randomChars(random);
    }
    lastTime = ms;
    lastRand = rand;
    return encodeTime(ms) + rand.map((c) => ALPHABET.charAt(c)).join('');
  };
}

/** Standard-Generator mit kryptografischem Zufall. */
export const newId: IdGenerator = createIdGenerator();

/** Zeitanteil einer ID in Millisekunden. */
export function idTime(id: string): number {
  let ms = 0;
  for (const ch of id.slice(0, TIME_LEN)) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('ids: ungültige ID');
    ms = ms * 32 + v;
  }
  return ms;
}

/** Deterministischer Pseudozufall (mulberry32) – für Demo-Daten und Tests. */
export function seededRandom(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
