import * as Sentry from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/node';
import type { Request } from 'express';

/**
 * Error tracking Sentry (SDK compatible GlitchTip auto-hébergé), partagé par les
 * 3 backs de templates. No-op tant que `SENTRY_DSN` est absent : aucun
 * `Sentry.init`, donc aucun envoi réseau — comme les drivers `fake` de la
 * plateforme. En prod, le DSN vient de Secret Manager (variable d'env, jamais
 * commité). L'environnement rapporté inclut le tenant pour trier les events.
 */

let enabled = false;

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

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

/** Purge en-têtes d'auth, cookies, query et corps sensibles. Exporté pour les tests. */
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

/** Initialise Sentry si `SENTRY_DSN` est configuré ; no-op sinon. */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (enabled || !dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.COMMIT_SHA,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
  // Distingue les events par tenant (une image sert tous les tenants d'un template).
  Sentry.setTag('tenant', process.env.TENANT_ID ?? 'dev');
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
