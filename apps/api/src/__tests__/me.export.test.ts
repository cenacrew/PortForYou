/**
 * Portabilité RGPD (GET /api/v1/me/account/export) — test unitaire avec
 * Firestore mocké (aucun émulateur requis). Vérifie l'ownership strict (le
 * user ne reçoit QUE ses propres données) et l'absence de secrets dans l'export.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { signAccessToken } from '../auth/service.js';

// Les données sont déclarées via `vi.hoisted` : la factory `vi.mock` ci-dessous
// est hoistée en tête de fichier et y accéderait avant leur initialisation sinon.
const { USERS, SITES, ORDERS } = vi.hoisted(() => {
  const ts = (iso: string) => ({ toDate: () => new Date(iso) });
  // Jeu de données : deux users distincts, pour prouver le cloisonnement.
  const USERS: Record<string, Record<string, unknown>> = {
    u1: {
      id: 'u1',
      email: 'alice@example.com',
      displayName: 'Alice Martin',
      provider: 'password',
      role: 'user',
      emailVerified: true,
      stripeCustomerId: 'cus_alice',
      passwordHash: 'HASH_SECRET_ALICE',
      createdAt: ts('2026-01-02T10:00:00Z'),
    },
    u2: {
      id: 'u2',
      email: 'bob@example.com',
      displayName: 'Bob Dupont',
      passwordHash: 'HASH_SECRET_BOB',
    },
  };
  const SITES = [
    {
      id: 's1',
      uid: 'u1',
      slug: 'atelier-alice',
      templateSlug: 'atelier',
      artistName: 'Alice Martin',
      status: 'live',
      createdAt: ts('2026-01-03T10:00:00Z'),
    },
    {
      id: 's2',
      uid: 'u2',
      slug: 'papier-bob',
      templateSlug: 'papier',
      artistName: 'Bob Dupont',
      status: 'live',
      createdAt: ts('2026-01-04T10:00:00Z'),
    },
  ];
  const ORDERS = [
    {
      id: 'o1',
      uid: 'u1',
      clientEmail: 'alice@example.com',
      templateSlug: 'atelier',
      siteSlug: 'atelier-alice',
      artistName: 'Alice Martin',
      contactEmail: 'alice@example.com',
      status: 'paid',
      createdAt: ts('2026-01-03T09:00:00Z'),
    },
    {
      id: 'o2',
      uid: 'u2',
      clientEmail: 'bob@example.com',
      templateSlug: 'papier',
      siteSlug: 'papier-bob',
      artistName: 'Bob Dupont',
      contactEmail: 'bob@example.com',
      status: 'paid',
      createdAt: ts('2026-01-04T09:00:00Z'),
    },
  ];
  return { USERS, SITES, ORDERS };
});

vi.mock('../lib/firebase.js', () => {
  type Row = Record<string, unknown>;
  const makeQuery = (items: Row[]) => {
    const q = {
      where: (field: string, _op: string, value: unknown) =>
        makeQuery(items.filter((it) => it[field] === value)),
      count: () => ({ get: async () => ({ data: () => ({ count: items.length }) }) }),
      get: async () => ({
        size: items.length,
        docs: items.map((it) => ({ id: it.id as string, data: () => it })),
      }),
    };
    return q;
  };
  const makeCollection = (items: Row[]) => ({
    ...makeQuery(items),
    doc: (id?: string) => ({
      get: async () => {
        const found = items.find((it) => it.id === id);
        return { exists: Boolean(found), id, data: () => found };
      },
    }),
  });
  const users = Object.values(USERS);
  const empty = makeCollection([]);
  return {
    db: { collection: () => empty },
    usersCol: () => makeCollection(users),
    ordersCol: () => makeCollection(ORDERS),
    sitesCol: () => makeCollection(SITES),
    deploymentsCol: () => empty,
    slugsCol: () => empty,
    stripeEventsCol: () => empty,
    emailLogsCol: () => empty,
    contactRequestsCol: () => empty,
    templatesCol: () => empty,
    tenantDoc: () => empty,
  };
});

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default;
}, 60000);

describe('GET /api/v1/me/account/export (portabilité RGPD)', () => {
  const token = signAccessToken({
    uid: 'u1',
    email: 'alice@example.com',
    displayName: 'Alice Martin',
    role: 'user',
    emailVerified: true,
  });

  it('401 sans authentification', async () => {
    const res = await request(app).get('/api/v1/me/account/export');
    expect(res.status).toBe(401);
  });

  it('renvoie un JSON téléchargeable avec le profil, les sites et les commandes du user', async () => {
    const res = await request(app)
      .get('/api/v1/me/account/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('portforyou-donnees-u1.json');

    const body = res.body as {
      format: string;
      profile: Record<string, unknown>;
      sites: Array<{ id: string }>;
      orders: Array<{ id: string }>;
    };
    expect(body.format).toBe('portforyou-account-export-v1');
    expect(body.profile.uid).toBe('u1');
    expect(body.profile.email).toBe('alice@example.com');
    expect(body.sites.map((s) => s.id)).toEqual(['s1']);
    expect(body.orders.map((o) => o.id)).toEqual(['o1']);
  });

  it('ne fuite AUCUNE donnée d’un autre user (ownership strict)', async () => {
    const res = await request(app)
      .get('/api/v1/me/account/export')
      .set('Authorization', `Bearer ${token}`);
    const raw = JSON.stringify(res.body);

    // Rien de Bob (u2) ne doit apparaître.
    expect(raw).not.toContain('u2');
    expect(raw).not.toContain('bob@example.com');
    expect(raw).not.toContain('papier-bob');
    expect(res.body.sites).toHaveLength(1);
    expect(res.body.orders).toHaveLength(1);
  });

  it('n’expose aucun secret (hash de mot de passe exclu)', async () => {
    const res = await request(app)
      .get('/api/v1/me/account/export')
      .set('Authorization', `Bearer ${token}`);
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain('HASH_SECRET_ALICE');
    expect(raw).not.toContain('passwordHash');
    expect(res.body.profile.passwordHash).toBeUndefined();
  });
});
