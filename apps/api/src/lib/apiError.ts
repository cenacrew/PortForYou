import type { Response } from 'express';
import { type ApiErrorCode } from '@portforyou/shared';

/**
 * Helper centralisé des réponses d'erreur de l'API plateforme.
 *
 * Toute erreur renvoyée au client suit la forme `{ code, error }` :
 * - `code` : identifiant machine stable (snake_case), sur lequel le front
 *   matche — ne change jamais, jamais traduit ;
 * - `error` : message français, libre d'évoluer / d'être traduit.
 *
 * `extra` permet d'ajouter des champs contextuels (details de validation,
 * requestId, provider…) sans casser le contrat.
 */
export function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  error: string,
  extra?: Record<string, unknown>,
): Response {
  return res.status(status).json({ code, error, ...extra });
}
