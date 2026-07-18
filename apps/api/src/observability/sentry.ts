import * as Sentry from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/node';
import type { Request } from 'express';
import { config } from '../config.js';

/**
 * Error tracking Sentry (SDK compatible GlitchTip auto-hébergé).
 *
 * No-op tant que `SENTRY_DSN` est absent : aucun appel `Sentry.init`, donc aucun
 * client actif et aucun envoi réseau — le comportement par défaut en local et en
 * CI, sur le même principe que les drivers `fake` des autres sous-systèmes. En
 * prod, le DSN provient de Secret Manager (variable d'env, jamais commité).
 */

let enabled = false;

/** En-têtes retirés des events avant envoi (secrets/PII). */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

/** Clés de payload masquées (mots de passe, tokens, secrets). */
const SENSITIVE_KEY = /(pass|password|token|secret|authorization|cookie|jwt|apikey|api_key)/i;

const REDACTED = '[redacted]';

function scrubHeaders(headers: Record<string, unknown>): void {
  for (const key of Object.keys(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) headers[key] = REDACTED;
  }
}

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
 * Purge les données sensibles d'un event avant envoi : en-têtes d'auth/cookies,
 * cookies parsés, query string et corps de requête (mots de passe, tokens…).
 * Exporté pour être testé unitairement.
 */
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  const req = event.request;
  if (req) {
    if (req.headers) scrubHeaders(req.headers as Record<string, unknown>);
    delete req.cookies;
    if (typeof req.query_string === 'object' && req.query_string) {
      req.query_string = scrubDeep(req.query_string) as typeof req.query_string;
    }
    if (req.data && typeof req.data === 'object') {
      req.data = scrubDeep(req.data);
    }
  }
  return event;
}

/** Initialise Sentry si un DSN est configuré ; no-op sinon. */
export function initSentry(): void {
  if (enabled || !config.SENTRY_DSN) return;
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
    release: config.COMMIT_SHA,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    // Ne jamais joindre l'IP/les cookies/headers d'auth automatiquement.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
  enabled = true;
}

/** True si Sentry est actif (DSN présent et init effectuée). */
export function isSentryEnabled(): boolean {
  return enabled;
}

/**
 * Capture une exception avec le contexte requête (request ID de corrélation issu
 * de `X-Cloud-Trace-Context`, méthode, chemin). No-op si Sentry est désactivé.
 */
export function captureRequestException(err: unknown, req?: Request): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (req) {
      if (req.requestId) scope.setTag('requestId', req.requestId);
      scope.setContext('request', { method: req.method, path: req.originalUrl ?? req.url });
    }
    Sentry.captureException(err);
  });
}
