import * as Sentry from '@sentry/nextjs';
import { CLIENT_DSN, scrubEvent } from '@/lib/sentry';

// Runtime navigateur. No-op si NEXT_PUBLIC_SENTRY_DSN est absent (dev/CI).
if (CLIENT_DSN) {
  Sentry.init({
    dsn: CLIENT_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

// Instrumentation des navigations App Router (no-op si Sentry inactif).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
