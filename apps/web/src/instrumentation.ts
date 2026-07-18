import * as Sentry from '@sentry/nextjs';

// Charge la config Sentry du runtime courant. Chaque config est no-op sans DSN.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Capture les erreurs des Server Components / route handlers (no-op si inactif).
export const onRequestError = Sentry.captureRequestError;
