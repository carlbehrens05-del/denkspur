/** Fehler für API-Methoden späterer Meilensteine. */
export class NotImplemented extends Error {
  override name = 'NotImplemented';
  constructor(method: string, milestone: string) {
    super(`${method} ist noch nicht umgesetzt (folgt in ${milestone}).`);
  }
}

/** Fachlicher Fehler mit verständlicher deutscher Meldung für die Oberfläche. */
export class DenkspurError extends Error {
  override name = 'DenkspurError';
}
