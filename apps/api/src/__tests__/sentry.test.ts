import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';

// Les exports nommés d'un module ESM ne sont pas espionnables (`vi.spyOn` échoue
// avec « Module namespace is not configurable »). On mocke donc le SDK : chaque
// export devient un `vi.fn()`, ce qui prouve qu'aucun appel réseau/init n'a lieu.
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: { setTag: () => void; setContext: () => void }) => void) =>
    cb({ setTag: vi.fn(), setContext: vi.fn() }),
  ),
}));

import * as Sentry from '@sentry/node';
import {
  initSentry,
  isSentryEnabled,
  captureRequestException,
  scrubEvent,
} from '../observability/sentry.js';

describe('sentry (no-op sans DSN)', () => {
  it('ne fait pas de init réseau quand SENTRY_DSN est absent', () => {
    // La config de test n'a pas de SENTRY_DSN → aucun client ne doit s'activer.
    initSentry();
    expect(isSentryEnabled()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('captureRequestException est un no-op quand Sentry est désactivé', () => {
    const req = { requestId: 'abc', method: 'GET', url: '/x' } as unknown as Request;
    expect(() => captureRequestException(new Error('boom'), req)).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('scrubEvent', () => {
  it("masque les en-têtes d'auth, cookies, query et corps sensibles", () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer secret-token',
          Cookie: 'session=abc',
          'User-Agent': 'jest',
        },
        cookies: { session: 'abc' },
        query_string: { token: 'leak', page: '2' },
        data: { email: 'a@b.c', password: 'hunter2', nested: { jwt: 'xyz' } },
      },
    } as unknown as Parameters<typeof scrubEvent>[0];

    const out = scrubEvent(event)!;
    const req = out.request!;
    expect((req.headers as Record<string, string>).Authorization).toBe('[redacted]');
    expect((req.headers as Record<string, string>).Cookie).toBe('[redacted]');
    expect((req.headers as Record<string, string>)['User-Agent']).toBe('jest');
    expect(req.cookies).toBeUndefined();
    expect((req.query_string as Record<string, string>).token).toBe('[redacted]');
    expect((req.query_string as Record<string, string>).page).toBe('2');
    const data = req.data as { email: string; password: string; nested: { jwt: string } };
    expect(data.password).toBe('[redacted]');
    expect(data.nested.jwt).toBe('[redacted]');
    expect(data.email).toBe('a@b.c');
  });
});
