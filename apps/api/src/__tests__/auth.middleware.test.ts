import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { requireAuth, requireAuthSse, requireAdmin } from '../middleware/auth.js';
import { signAccessToken } from '../auth/service.js';

const USER = {
  uid: 'u1',
  email: 'a@b.co',
  displayName: 'Alice',
  role: 'admin' as const,
  emailVerified: true,
};

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('requireAuth (JWT maison)', () => {
  it('401 sans header Authorization', () => {
    const res = mockRes();
    requireAuth({ headers: {} } as Request, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });

  it('401 si le token est forgé avec un autre secret', () => {
    const forged = jwt.sign({ sub: 'u1' }, 'mauvais_secret', { issuer: 'portforyou' });
    const res = mockRes();
    const next = vi.fn();
    requireAuth({ headers: { authorization: `Bearer ${forged}` } } as Request, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 si le token est expiré', () => {
    const expired = jwt.sign({ sub: 'u1' }, 'dev_secret_change_me', {
      issuer: 'portforyou',
      expiresIn: '-1s',
    });
    const res = mockRes();
    requireAuth({ headers: { authorization: `Bearer ${expired}` } } as Request, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });

  it('pose req.user et appelle next() sur token valide', () => {
    const token = signAccessToken(USER);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const next = vi.fn();
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: 'u1',
      email: 'a@b.co',
      displayName: 'Alice',
      emailVerified: true,
      admin: true,
    });
  });
});

describe('requireAuthSse', () => {
  it('accepte le token en query (EventSource)', () => {
    const token = signAccessToken(USER);
    const req = { headers: {}, query: { token } } as unknown as Request;
    const next = vi.fn();
    requireAuthSse(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.uid).toBe('u1');
  });

  it('401 sans token', () => {
    const res = mockRes();
    requireAuthSse({ headers: {}, query: {} } as unknown as Request, res, vi.fn());
    expect(res.statusCode).toBe(401);
  });
});

describe('requireAdmin', () => {
  it('403 pour un user non admin', () => {
    const res = mockRes();
    requireAdmin(
      {
        user: { uid: 'u1', email: '', displayName: '', emailVerified: true, admin: false },
      } as Request,
      res,
      vi.fn(),
    );
    expect(res.statusCode).toBe(403);
  });

  it('laisse passer un admin', () => {
    const next = vi.fn();
    requireAdmin(
      {
        user: { uid: 'u1', email: '', displayName: '', emailVerified: true, admin: true },
      } as Request,
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});
