import { createClient, type DenkspurClient } from '../core/api/client';

let client: DenkspurClient | null = null;

/** Die eine Verbindung zum DB-Worker. */
export function api(): DenkspurClient {
  client ??= createClient();
  return client;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}
