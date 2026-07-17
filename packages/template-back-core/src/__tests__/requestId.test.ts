import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requestId } from '../middleware/requestId.js';

function mockRes() {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
  };
  return res as unknown as Response & { headers: Record<string, string> };
}

describe('requestId', () => {
  it("reprend l'ID de trace de Cloud Run (avant le /)", () => {
    const req = {
      headers: { 'x-cloud-trace-context': 'abc123def456/789;o=1' },
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    requestId(req, res, next);
    expect(req.requestId).toBe('abc123def456');
    expect(res.headers['X-Request-Id']).toBe('abc123def456');
    expect(next).toHaveBeenCalled();
  });

  it('génère un UUID en local (sans en-tête de trace)', () => {
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    requestId(req, res, next);
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res.headers['X-Request-Id']).toBe(req.requestId);
    expect(next).toHaveBeenCalled();
  });
});
