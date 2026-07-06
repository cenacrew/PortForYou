import { NextResponse } from 'next/server';

/**
 * CSP compatible avec le rendu statique de Next (pages prérendues + cache CDN
 * Firebase Hosting). On n'utilise PAS de nonce/`strict-dynamic` : Next n'injecte
 * le nonce que dans les pages rendues dynamiquement, or nos pages marketing sont
 * prérendues → les scripts inline d'hydratation (`__next_f`) n'auraient pas de
 * nonce et seraient tous bloqués. On autorise donc `'self'` (chunks /_next) et
 * `'unsafe-inline'` (bootstrap inline). `unsafe-eval` uniquement en dev (HMR).
 */
export function middleware() {
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    // Emotion/next/font injectent des styles inline ; GSAP pose des styles élément.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://storage.googleapis.com`,
    `font-src 'self'`,
    // API plateforme uniquement (l'OAuth Google est une navigation pleine page)
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ''}${
      isDev ? ' http://localhost:* ws://localhost:*' : ''
    }`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques
    { source: '/((?!_next/static|_next/image|favicon.ico|templates/).*)' },
  ],
};
