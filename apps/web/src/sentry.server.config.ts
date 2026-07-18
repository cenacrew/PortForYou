import * as Sentry from '@sentry/nextjs';
import { SERVER_DSN, scrubEvent } from '@/lib/sentry';

// No-op si aucun DSN n'est configuré : aucun init, aucun envoi réseau.
if (SERVER_DSN) {
  Sentry.init({
    dsn: SERVER_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
