import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Ces tests utilisent le fallback dev : admin@example.com / admin123
// (déclenché quand ADMIN_PASSWORD_HASH n'est pas défini)

describe('POST /api/v1/auth/login', () => {
  it('retourne 200 et pose un cookie pour credentials valides', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.email).toBe('admin@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('retourne 401 pour un mot de passe incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'mauvais_mdp' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('retourne 401 pour un email inconnu', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inconnu@test.com', password: 'admin123' });
    expect(res.status).toBe(401);
  });

  it('retourne 400 si le body est vide', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('retourne 400 si le mot de passe est manquant', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@example.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('retourne 200 et efface le cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
