import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

// N'enveloppe la config Sentry (plugin de build, upload de sourcemaps) que si un
// DSN est configuré : build local/CI sans DSN = comportement Next standard, aucun
// appel réseau, aucun secret requis.
export default withNextIntl(
  process.env.NEXT_PUBLIC_SENTRY_DSN
    ? withSentryConfig(nextConfig, {
        // Auth token via env (SENTRY_AUTH_TOKEN) — jamais commité. Absent = pas
        // d'upload de sourcemaps, le build reste fonctionnel.
        silent: true,
        telemetry: false,
      })
    : nextConfig,
);
