import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';

// Les exports nommés d'un module ESM ne sont pas espionnables (`vi.spyOn` échoue
// avec « Module namespace is not configurable »). On mocke donc le SDK.
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: { setTag: () => void; setContext: () => void }) => void) =>
    cb({ setTag: vi.fn(), setContext: vi.fn() }),
  ),
}));

import * as Sentry from '@sentry/node';
import { initSentry, isSentryEnabled, captureRequestException, scrubEvent } from '../lib/sentry.js';

describe('sentry (no-op sans DSN)', () => {
  it("n'initialise pas Sentry quand SENTRY_DSN est absent", () => {
    const previous = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    initSentry();
    expect(isSentryEnabled()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    if (previous !== undefined) process.env.SENTRY_DSN = previous;
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
        headers: { Authorization: 'Bearer tok', Cookie: 'a=b', 'User-Agent': 'jest' },
        cookies: { a: 'b' },
        query_string: { token: 'leak', page: '2' },
        data: { email: 'a@b.c', password: 'hunter2' },
      },
    } as unknown as Parameters<typeof scrubEvent>[0];

    const req = scrubEvent(event)!.request!;
    expect((req.headers as Record<string, string>).Authorization).toBe('[redacted]');
    expect((req.headers as Record<string, string>)['User-Agent']).toBe('jest');
    expect(req.cookies).toBeUndefined();
    expect((req.query_string as Record<string, string>).token).toBe('[redacted]');
    expect((req.data as { password: string }).password).toBe('[redacted]');
    expect((req.data as { email: string }).email).toBe('a@b.c');
  });
});
