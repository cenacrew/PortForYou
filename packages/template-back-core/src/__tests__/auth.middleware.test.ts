import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { authMiddleware, signToken } from '../middleware/auth.js';

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ cookies: {}, headers: {}, ...overrides }) as unknown as Request;

function makeRes() {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  };
  return res as unknown as Response & { _status: number; _body: unknown };
}

describe('authMiddleware', () => {
  it('retourne 401 si aucun token', () => {
    const req = makeReq();
    const res = makeRes();
    let called = false;
    authMiddleware(req, res, () => {
      called = true;
    });
    expect(res._status).toBe(401);
    expect(called).toBe(false);
  });

  it('accepte un token valide dans le cookie', () => {
    const token = signToken({ id: 'admin', email: 'a@test.com', role: 'admin' });
    const req = makeReq({ cookies: { token } });
    const res = makeRes();
    let called = false;
    authMiddleware(req, res, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(req.user?.email).toBe('a@test.com');
  });

  it('accepte un token valide dans le header Authorization', () => {
    const token = signToken({ id: 'admin', email: 'a@test.com', role: 'admin' });
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res = makeRes();
    let called = false;
    authMiddleware(req, res, () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it('le cookie a priorité sur le header', () => {
    const cookieToken = signToken({ id: 'admin', email: 'cookie@test.com', role: 'admin' });
    const headerToken = signToken({ id: 'other', email: 'header@test.com', role: 'admin' });
    const req = makeReq({
      cookies: { token: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    });
    const res = makeRes();
    authMiddleware(req, res, () => {});
    expect(req.user?.email).toBe('cookie@test.com');
  });

  it('retourne 401 pour un token invalide', () => {
    const req = makeReq({ cookies: { token: 'token.invalide.ici' } });
    const res = makeRes();
    authMiddleware(req, res, () => {});
    expect(res._status).toBe(401);
    expect((res._body as { error: string }).error).toBe('Invalid or expired token');
  });

  it('attache le payload décodé à req.user', () => {
    const token = signToken({ id: 'u1', email: 'user@test.com', role: 'admin' });
    const req = makeReq({ cookies: { token } });
    const res = makeRes();
    authMiddleware(req, res, () => {});
    expect(req.user?.role).toBe('admin');
    expect(req.user?.email).toBe('user@test.com');
  });
});
