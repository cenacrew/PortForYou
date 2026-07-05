import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock Firebase avant l'import de app
vi.mock('../lib/firebaseAdmin.js', () => {
  // Mock récursif : les documents exposent .collection() pour supporter
  // le chemin multi-tenant tenants/{TENANT_ID}/artworks.
  const collectionMock = {
    add: vi.fn().mockResolvedValue({ id: 'mock-artwork-id' }),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
  };
  const docMock = {
    get: vi
      .fn()
      .mockResolvedValue({ exists: true, id: 'mock-id', data: () => ({ title: 'Test' }) }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue({}),
    collection: vi.fn(() => collectionMock),
  };
  collectionMock.doc = vi.fn(() => docMock);
  return {
    db: { collection: vi.fn(() => collectionMock) },
    storage: null,
    storageBucketName: null,
  };
});

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => new Date().toISOString() },
}));

let app;
let authCookie;

beforeAll(async () => {
  app = (await import('../app.js')).default;

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  authCookie = loginRes.headers['set-cookie'];
});

describe('POST /api/v1/admin/artworks', () => {
  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .post('/api/v1/admin/artworks')
      .send({ title: 'Test', technique: 'drawing', imageUrl: 'https://img.com/a.jpg' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si title manquant', async () => {
    const res = await request(app)
      .post('/api/v1/admin/artworks')
      .set('Cookie', authCookie)
      .send({ technique: 'drawing', imageUrl: 'https://img.com/a.jpg' });
    expect(res.status).toBe(400);
  });

  it('retourne 400 si technique invalide', async () => {
    const res = await request(app)
      .post('/api/v1/admin/artworks')
      .set('Cookie', authCookie)
      .send({ title: 'Test', technique: 'peinture_huile', imageUrl: 'https://img.com/a.jpg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/technique/i);
  });

  it('retourne 400 si imageUrl manquante', async () => {
    const res = await request(app)
      .post('/api/v1/admin/artworks')
      .set('Cookie', authCookie)
      .send({ title: 'Test', technique: 'drawing' });
    expect(res.status).toBe(400);
  });

  it('retourne 201 pour une œuvre valide', async () => {
    const res = await request(app)
      .post('/api/v1/admin/artworks')
      .set('Cookie', authCookie)
      .send({ title: 'Ma peinture', technique: 'drawing', imageUrl: 'https://img.com/a.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('mock-artwork-id');
  });
});

describe('PUT /api/v1/admin/site-config', () => {
  it('retourne 401 sans authentification', async () => {
    const res = await request(app)
      .put('/api/v1/admin/site-config')
      .send({ contactEmail: 'test@test.com' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 pour des newsItems invalides', async () => {
    const res = await request(app)
      .put('/api/v1/admin/site-config')
      .set('Cookie', authCookie)
      .send({ newsItems: [{ title: 'Sans date' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejette les champs non autorisés', async () => {
    const res = await request(app)
      .put('/api/v1/admin/site-config')
      .set('Cookie', authCookie)
      .send({ champsInterdit: 'valeur' });
    expect(res.status).toBe(400);
  });
});
