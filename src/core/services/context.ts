import type { Db } from '../db/types';
import { newId, type IdGenerator } from '../util/ids';
import { systemClock, type Clock } from '../util/time';

/** Alles, was ein Service braucht: Datenbank, Uhr, ID-Erzeugung. */
export interface Ctx {
  db: Db;
  now: Clock;
  id: IdGenerator;
}

export function createCtx(db: Db, now: Clock = systemClock, id: IdGenerator = newId): Ctx {
  return { db, now, id };
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (text === null || text === undefined || text === '') return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
