import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Mock Firebase avant l'import de l'app : la doc OpenAPI ne touche pas
// Firestore, mais app.ts importe les routes qui, elles, en dépendent.
vi.mock('../lib/firebase.js', () => {
  const chain: Record<string, unknown> = {
    limit: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    where: vi.fn(() => chain),
    get: vi.fn().mockResolvedValue({ docs: [] }),
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

describe('GET /api/v1/docs', () => {
  it('répond 200 avec un document OpenAPI valide (openapi + paths non vide)', async () => {
    const res = await request(app).get('/api/v1/docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info?.title).toBeTruthy();
    expect(res.body.paths).toBeTruthy();
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
  });

  it('documente les routes principales (public, auth, orders, me, admin)', async () => {
    const res = await request(app).get('/api/v1/docs');
    const paths = Object.keys(res.body.paths);
    expect(paths).toContain('/api/v1/templates');
    expect(paths).toContain('/api/v1/auth/login');
    expect(paths).toContain('/api/v1/orders');
    expect(paths).toContain('/api/v1/me/sites');
    expect(paths).toContain('/api/v1/admin/overview');
  });

  it('dérive les composants des schémas zod partagés', async () => {
    const res = await request(app).get('/api/v1/docs');
    expect(res.body.components?.schemas?.OrderCreateInput).toBeTruthy();
  });

  it("n'expose AUCUNE route interne /internal", async () => {
    const res = await request(app).get('/api/v1/docs');
    for (const p of Object.keys(res.body.paths)) {
      expect(p.includes('/internal')).toBe(false);
    }
  });
});
