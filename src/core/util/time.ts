/** Zeitpunkte werden als ISO-8601-UTC gespeichert und in Europe/Berlin angezeigt. */

export type Clock = () => string;

export const systemClock: Clock = () => new Date().toISOString();

export const DISPLAY_TZ = 'Europe/Berlin';

const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: DISPLAY_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: DISPLAY_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateTimeFmt.format(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '–' : dateFmt.format(d);
}

/** Berliner Ortszeit → ISO-UTC. Berücksichtigt Sommer-/Winterzeit. */
export function berlinToIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess - (shown - guess)).toISOString();
}
