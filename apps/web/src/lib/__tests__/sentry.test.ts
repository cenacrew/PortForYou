import { describe, it, expect } from 'vitest';
import { scrubEvent } from '../sentry';

describe('scrubEvent (vitrine)', () => {
  it("masque en-têtes d'auth, cookies, query et corps sensibles", () => {
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
    expect((req.query_string as Record<string, string>).page).toBe('2');
    expect((req.data as { password: string }).password).toBe('[redacted]');
    expect((req.data as { email: string }).email).toBe('a@b.c');
  });

  it('laisse passer un event sans requête', () => {
    const event = { message: 'x' } as unknown as Parameters<typeof scrubEvent>[0];
    expect(scrubEvent(event)).toBe(event);
  });
});
