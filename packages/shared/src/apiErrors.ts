import { z } from 'zod';

/**
 * Codes d'erreur machine de l'API plateforme.
 *
 * Contrat stable : le front (et tout autre client) matche sur `code`
 * (snake_case, jamais traduit), le champ `error` reste un message français
 * libre d'évoluer. Toute réponse d'erreur passe par le helper `sendError`
 * (`apps/api/src/lib/apiError.ts`) qui garantit la forme `{ code, error }`.
 */
export const API_ERROR_CODES = [
  // Génériques / transverses
  'validation_failed',
  'rate_limited',
  'internal_error',
  // Authentification & session
  'auth_required',
  'admin_required',
  'invalid_credentials',
  'account_uses_google',
  'email_taken',
  'no_session',
  'session_expired',
  'account_not_found',
  'invalid_or_expired_token',
  // Commandes / sites / déploiements
  'slug_taken',
  'slug_hosting_unavailable',
  'site_not_found',
  'deployment_not_found',
  'order_not_found',
  'site_not_live',
  'site_not_in_error',
  'email_not_verified',
  'site_limit_reached',
  // Paiement / webhooks
  'stripe_disabled',
  'webhook_secret_missing',
  'invalid_signature',
  'webhook_processing_failed',
  'fake_payment_disabled',
  // Endpoints internes (OIDC Cloud Tasks/Scheduler)
  'oidc_invalid',
  'oidc_service_account_forbidden',
  // Intégrité des données
  'document_corrupted',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Schéma zod du corps d'une réponse d'erreur de l'API. */
export const apiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  error: z.string(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
