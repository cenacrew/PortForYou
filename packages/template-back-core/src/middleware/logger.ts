import { pino } from 'pino';
import { pinoHttp, type Options } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request } from 'express';

/**
 * Logs structurés JSON exploitables par Google Cloud Logging (remplace morgan).
 *
 * Duplique volontairement `apps/api/src/observability/logger.ts` : les deux
 * services sont déployés séparément (aucun paquet partagé n'est importé par les
 * deux) et lisent leur config depuis des sources différentes (zod côté API,
 * `process.env` côté template). Garder ce fichier aligné sur celui de l'API.
 *
 * En prod (Cloud Run), chaque ligne est un JSON parsé nativement par Cloud
 * Logging : `severity` (mappé depuis le niveau pino), `message` lisible, infos
 * de requête sous `httpRequest` (format LogEntry GCP) et
 * `logging.googleapis.com/trace` corrélé à `X-Cloud-Trace-Context`. En dev,
 * `pino-pretty` rend une sortie colorée lisible ; en test, JSON simple.
 */

const NODE_ENV = process.env.NODE_ENV ?? 'development';
// Sous vitest, pas de transport pino-pretty : son worker thread ferait timeout
// les hooks de test. Détection via VITEST même si NODE_ENV n'est pas 'test'.
const isTest = NODE_ENV === 'test' || process.env.VITEST !== undefined;
const isDev = NODE_ENV === 'development' && !isTest;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;

/** Mapping niveau pino → severity Google Cloud Logging. */
const LEVEL_TO_SEVERITY: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

/** Traduit un niveau pino en `severity` Google Cloud Logging (`DEFAULT` sinon). */
export function levelToSeverity(label: string): string {
  return LEVEL_TO_SEVERITY[label] ?? 'DEFAULT';
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
  messageKey: 'message',
  formatters: {
    level(label) {
      return { severity: levelToSeverity(label) };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
    : {}),
});

/** ID de trace GCP (`projects/<PROJECT>/traces/<traceId>`) depuis l'en-tête Cloud Run. */
function traceField(req: IncomingMessage): Record<string, string> {
  const header = req.headers['x-cloud-trace-context'];
  const traceId = typeof header === 'string' ? header.split('/')[0]?.trim() : undefined;
  if (!traceId || !GCP_PROJECT_ID) return {};
  return { 'logging.googleapis.com/trace': `projects/${GCP_PROJECT_ID}/traces/${traceId}` };
}

/** Latence au format GCP (`"0.123s"`) à partir du responseTime pino-http (ms). */
function latency(res: ServerResponse & { responseTime?: number }): string | undefined {
  return typeof res.responseTime === 'number'
    ? `${(res.responseTime / 1000).toFixed(3)}s`
    : undefined;
}

const httpOptions: Options = {
  logger,
  genReqId: (req) => (req as Request).requestId ?? '-',
  serializers: { req: () => undefined, res: () => undefined },
  customProps: (req, res) => {
    const r = req as unknown as Request;
    const httpRequest: Record<string, unknown> = {
      requestMethod: req.method,
      requestUrl: r.originalUrl ?? req.url,
      status: res.statusCode,
      userAgent: req.headers['user-agent'],
      remoteIp: r.ip,
      latency: latency(res as ServerResponse & { responseTime?: number }),
    };
    return { requestId: r.requestId, httpRequest, ...traceField(req) };
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${(req as Request).originalUrl ?? req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${(req as Request).originalUrl ?? req.url} ${res.statusCode} - ${err.message}`,
};

/** Middleware Express de log HTTP structuré (remplace morgan). */
export const httpLogger = pinoHttp(httpOptions);

export default httpLogger;
