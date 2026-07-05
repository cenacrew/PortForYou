import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP stricte avec nonce par requête : Next détecte le nonce dans l'en-tête
 * CSP et l'applique automatiquement à ses scripts inline.
 * `unsafe-eval` est requis uniquement en dev (fast refresh).
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques
    { source: '/((?!_next/static|_next/image|favicon.ico|templates/).*)' },
  ],
};
