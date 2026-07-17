import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Corrélation des requêtes. Reprend l'identifiant de trace injecté par Cloud Run
 * (en-tête `X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=TRACE_TRUE`) ou en génère
 * un en local. Exposé sur `req.requestId`, renvoyé dans l'en-tête `X-Request-Id`
 * et repris dans les réponses d'erreur — de quoi relier un log à une requête.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['x-cloud-trace-context'];
  const fromTrace = typeof header === 'string' ? header.split('/')[0]?.trim() : undefined;
  const id = fromTrace || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
