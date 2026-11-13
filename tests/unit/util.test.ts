import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { entryContentHash, sha256BytesAsync, sha256Hex } from '../../src/core/util/hash';
import { createIdGenerator, idTime, newId, seededRandom } from '../../src/core/util/ids';
import { berlinToIso, formatDateTime } from '../../src/core/util/time';

describe('hash', () => {
  it('liefert bekannte SHA-256-Werte', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('stimmt mit node:crypto überein (Umlaute, lange Texte)', () => {
    for (const s of [
      'über Größe Straße',
      'x'.repeat(1000),
      '4.000 Wildbienen 🐝',
      'a'.repeat(55),
      'a'.repeat(64),
    ]) {
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s, 'utf8').digest('hex'));
    }
  });

  it('asynchrone Variante über WebCrypto liefert dasselbe', async () => {
    const data = new TextEncoder().encode('Facharbeit');
    expect(await sha256BytesAsync(data)).toBe(sha256Hex('Facharbeit'));
  });

  it('Inhalts-Hash nach Vertrag kind|role|zeit|text', () => {
    expect(entryContentHash('message', 'originator', '2026-01-01T00:00:00.000Z', 'Hallo')).toBe(
      sha256Hex('message|originator|2026-01-01T00:00:00.000Z|Hallo'),
    );
  });
});

describe('ids', () => {
  it('sind 26 Zeichen lang und zeitlich sortierbar', () => {
    const gen = createIdGenerator();
    const a = gen('2026-03-01T00:00:00.000Z');
    const b = gen('2026-03-02T00:00:00.000Z');
    expect(a).toHaveLength(26);
    expect(a < b).toBe(true);
    expect(new Date(idTime(a)).toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('bleiben innerhalb derselben Millisekunde monoton', () => {
    const gen = createIdGenerator(seededRandom(1), () => 1_000);
    const ids = Array.from({ length: 200 }, () => gen());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(200);
  });

  it('sind mit Seed deterministisch', () => {
    const a = createIdGenerator(seededRandom(7));
    const b = createIdGenerator(seededRandom(7));
    expect(a('2026-05-05T10:00:00.000Z')).toBe(b('2026-05-05T10:00:00.000Z'));
  });

  it('Standard-Generator erzeugt eindeutige IDs', () => {
    expect(newId()).not.toBe(newId());
  });
});

describe('time', () => {
  it('rechnet Berliner Ortszeit inkl. Sommerzeit in UTC um', () => {
    expect(berlinToIso(2026, 1, 15, 12, 0)).toBe('2026-01-15T11:00:00.000Z');
    expect(berlinToIso(2026, 7, 15, 12, 0)).toBe('2026-07-15T10:00:00.000Z');
  });

  it('zeigt Zeitpunkte in Europe/Berlin an', () => {
    expect(formatDateTime('2026-07-15T10:00:00.000Z')).toBe('15.07.2026, 12:00');
  });
});
