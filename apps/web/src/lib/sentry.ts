import type { ErrorEvent, EventHint } from '@sentry/nextjs';

/**
 * Réglages Sentry partagés par les trois runtimes de la vitrine (client, serveur,
 * edge). No-op tant qu'aucun DSN n'est configuré : les fichiers `sentry.*.config`
 * n'appellent `Sentry.init` que si `dsn` est défini, donc aucun envoi réseau en
 * dev/CI. En prod, le DSN vient de variables d'env (jamais commité, dépôt public).
 */

/** DSN exposé au navigateur (public par nature côté Sentry). */
export const CLIENT_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** DSN utilisé côté serveur/edge (retombe sur le DSN public si non distinct). */
export const SERVER_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

const SENSITIVE_KEY = /(pass|password|token|secret|authorization|cookie|jwt|apikey|api_key)/i;
const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
const REDACTED = '[redacted]';

function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrubDeep(v, depth + 1);
  }
  return out;
}

/**
 * Purge les données sensibles d'un event avant envoi (en-têtes d'auth, cookies,
 * query string, corps). Exporté pour les tests unitaires.
 */
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  const req = event.request;
  if (req) {
    if (req.headers) {
      for (const key of Object.keys(req.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          (req.headers as Record<string, unknown>)[key] = REDACTED;
        }
      }
    }
    delete req.cookies;
    if (typeof req.query_string === 'object' && req.query_string) {
      req.query_string = scrubDeep(req.query_string) as typeof req.query_string;
    }
    if (req.data && typeof req.data === 'object') req.data = scrubDeep(req.data);
  }
  return event;
}
