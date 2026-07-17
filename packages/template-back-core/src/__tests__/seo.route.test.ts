import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Mock Firebase : la collection artworks renvoie 2 œuvres pour le sitemap.
vi.mock('../lib/firebaseAdmin.js', () => {
  const artworkDocs = [
    { id: 'art-1', data: () => ({ title: 'Œuvre 1', updatedAt: '2026-01-15T10:00:00.000Z' }) },
    { id: 'art-2', data: () => ({ title: 'Œuvre 2' }) },
  ];
  const collectionMock: Record<string, unknown> = {
    add: vi.fn(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: artworkDocs }),
  };
  const docMock = {
    get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    update: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
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

let app: Express;

beforeAll(async () => {
  app = (await import('../app.js')).default;
}, 30000);

describe('GET /sitemap.xml', () => {
  it('renvoie un XML de sitemap avec les pages statiques et les œuvres', async () => {
    const res = await request(app)
      .get('/sitemap.xml')
      .set('Host', 'pfy-demo.web.app')
      .set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.text).toContain('<urlset');
    // Pages statiques : construit l'URL absolue depuis l'hôte de la requête.
    expect(res.text).toContain('<loc>https://pfy-demo.web.app/</loc>');
    expect(res.text).toContain('<loc>https://pfy-demo.web.app/galerie</loc>');
    // Fiches œuvres.
    expect(res.text).toContain('<loc>https://pfy-demo.web.app/galerie/art-1</loc>');
    expect(res.text).toContain('<loc>https://pfy-demo.web.app/galerie/art-2</loc>');
    // lastmod présent quand updatedAt existe.
    expect(res.text).toContain('<lastmod>2026-01-15</lastmod>');
  });
});

describe('GET /robots.txt', () => {
  it('autorise le crawl, exclut /admin et référence le sitemap', async () => {
    const res = await request(app)
      .get('/robots.txt')
      .set('Host', 'pfy-demo.web.app')
      .set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('User-agent: *');
    expect(res.text).toContain('Disallow: /admin');
    expect(res.text).toContain('Sitemap: https://pfy-demo.web.app/sitemap.xml');
  });
});
