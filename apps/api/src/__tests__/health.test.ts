import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Contrôle le résultat de la lecture Firestore du healthcheck.
const { healthGet } = vi.hoisted(() => ({ healthGet: vi.fn() }));

// Mock Firebase avant l'import de l'app : aucune connexion réelle requise.
vi.mock('../lib/firebase.js', () => {
  const chain: Record<string, unknown> = {
    limit: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    where: vi.fn(() => chain),
    get: healthGet,
    add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ exists: false }) })),
  };
  const collection = vi.fn(() => chain);
  const db = { collection };
  return {
    db,
    usersCol: () => collection(),
    ordersCol: () => collection(),
    sitesCol: () => collection(),
    deploymentsCol: () => collection(),
    slugsCol: () => collection(),
    stripeEventsCol: () => collection(),
    emailLogsCol: () => collection(),
    contactRequestsCol: () => collection(),
    templatesCol: () => collection(),
    tenantDoc: () => chain.doc,
  };
});

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default;
}, 60000);

describe('GET /api/v1/health', () => {
  it('répond 200 avec le commit et un en-tête X-Request-Id quand Firestore répond', async () => {
    healthGet.mockResolvedValueOnce({ docs: [] });
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('portforyou-api');
    expect(res.body.commit).toBeDefined();
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('répond 503 quand la lecture Firestore échoue (souci IAM/connexion)', async () => {
    healthGet.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('firestore_unreachable');
  });

  it('reprend l’ID de trace Cloud Run dans X-Request-Id', async () => {
    healthGet.mockResolvedValueOnce({ docs: [] });
    const res = await request(app)
      .get('/api/v1/health')
      .set('X-Cloud-Trace-Context', 'trace-xyz/1;o=1');
    expect(res.headers['x-request-id']).toBe('trace-xyz');
  });
});
