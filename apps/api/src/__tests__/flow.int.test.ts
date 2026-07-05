/**
 * Intégration contre l'émulateur Firestore, avec l'AUTH MAISON RÉELLE :
 * inscription → commande → paiement fake → provisioning fake → site live.
 * Lancé via `pnpm test:emu` (CI) ou avec un émulateur déjà démarré.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIf = hasEmulator ? describe : describe.skip;

let app: import('express').Express;

beforeAll(async () => {
  process.env.PROVISIONER_FAKE_DELAY_MS = '5';
  if (hasEmulator) {
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/portforyou-vsp/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }
  app = (await import('../app.js')).default;
}, 60000);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function registerUser(name: string, email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'motdepasse-solide' });
  expect(res.status).toBe(201);
  return { token: res.body.accessToken as string, cookie: res.headers['set-cookie'] };
}

describeIf('auth maison (émulateur Firestore)', () => {
  it('register → login → refresh rotatif → logout', async () => {
    await registerUser('Rémi', 'remi@example.com');

    // Email déjà pris
    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', email: 'remi@example.com', password: 'motdepasse-solide' });
    expect(dup.status).toBe(409);

    // Mauvais mot de passe
    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'remi@example.com', password: 'mauvais-mdp!' });
    expect(bad.status).toBe(401);

    // Login + session cookie (agent conserve les cookies)
    const agent = request.agent(app);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'remi@example.com', password: 'motdepasse-solide' });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('remi@example.com');
    expect(login.headers['set-cookie']?.[0]).toContain('pfy_rt=');
    expect(login.headers['set-cookie']?.[0]).toContain('HttpOnly');

    // Refresh : nouveau token, cookie roté
    const refresh1 = await agent.post('/api/v1/auth/refresh');
    expect(refresh1.status).toBe(200);
    expect(refresh1.body.accessToken).toBeTruthy();

    const refresh2 = await agent.post('/api/v1/auth/refresh');
    expect(refresh2.status).toBe(200);

    // Logout : la session est révoquée, le refresh suivant échoue
    await agent.post('/api/v1/auth/logout');
    const after = await agent.post('/api/v1/auth/refresh');
    expect(after.status).toBe(401);
  });

  it('un access token protège les routes /me', async () => {
    const { token } = await registerUser('Sami', 'sami@example.com');
    const noAuth = await request(app).get('/api/v1/me/sites');
    expect(noAuth.status).toBe(401);
    const ok = await request(app).get('/api/v1/me/sites').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.items).toEqual([]);
  });
});

describeIf('flow commande → provisioning (émulateur Firestore)', () => {
  let alice = '';
  let bob = '';

  beforeAll(async () => {
    alice = (await registerUser('Alice Martin', 'alice@example.com')).token;
    bob = (await registerUser('Bob', 'bob@example.com')).token;
  }, 30000);

  it('GET /health répond', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /templates liste les 3 templates', async () => {
    const res = await request(app).get('/api/v1/templates');
    expect(res.body.items).toHaveLength(3);
  });

  it('rejette un slug invalide ou blacklisté', async () => {
    for (const slug of ['ab', 'admin', 'demo-x', 'Père']) {
      const res = await request(app).get(`/api/v1/slugs/check?slug=${encodeURIComponent(slug)}`);
      expect(res.body.available).toBe(false);
    }
  });

  it('POST /orders exige une authentification', async () => {
    const res = await request(app).post('/api/v1/orders').send({});
    expect(res.status).toBe(401);
  });

  it('POST /orders valide le body avec zod', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${alice}`)
      .send({ templateSlug: 'atelier', siteSlug: 'A!', artistName: '', contactEmail: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.details?.length).toBeGreaterThan(0);
  });

  it('déroule le flow complet jusqu’au site live', async () => {
    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${alice}`)
      .send({
        templateSlug: 'atelier',
        siteSlug: 'atelier-de-alice',
        artistName: 'Alice Martin',
        contactEmail: 'alice@example.com',
      });
    expect(order.status).toBe(201);
    expect(order.body.checkoutUrl).toContain('fake-checkout');

    const check = await request(app).get('/api/v1/slugs/check?slug=atelier-de-alice');
    expect(check.body.available).toBe(false);

    const conflict = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${bob}`)
      .send({
        templateSlug: 'atelier',
        siteSlug: 'atelier-de-alice',
        artistName: 'Bob',
        contactEmail: 'bob@example.com',
      });
    expect(conflict.status).toBe(409);

    const forbidden = await request(app)
      .post('/api/v1/payments/fake/confirm')
      .set('Authorization', `Bearer ${bob}`)
      .send({ orderId: order.body.orderId });
    expect(forbidden.status).toBe(404);

    const confirm = await request(app)
      .post('/api/v1/payments/fake/confirm')
      .set('Authorization', `Bearer ${alice}`)
      .send({ orderId: order.body.orderId });
    expect(confirm.status).toBe(200);
    const siteId = confirm.body.siteId as string;

    const again = await request(app)
      .post('/api/v1/payments/fake/confirm')
      .set('Authorization', `Bearer ${alice}`)
      .send({ orderId: order.body.orderId });
    expect(again.body.siteId).toBe(siteId);

    let site: { status?: string; urls?: { front?: string } } | null = null;
    for (let i = 0; i < 40; i++) {
      await wait(100);
      const res = await request(app)
        .get(`/api/v1/me/sites/${siteId}`)
        .set('Authorization', `Bearer ${alice}`);
      expect(res.status).toBe(200);
      site = res.body.site;
      if (res.body.site.status === 'live') break;
    }
    expect(site?.status).toBe('live');
    expect(site?.urls?.front).toBeTruthy();

    const detail = await request(app)
      .get(`/api/v1/me/sites/${siteId}`)
      .set('Authorization', `Bearer ${alice}`);
    const steps = detail.body.lastDeployment.steps as Array<{ status: string }>;
    expect(steps.every((step) => step.status === 'done')).toBe(true);

    const stranger = await request(app)
      .get(`/api/v1/me/sites/${siteId}`)
      .set('Authorization', `Bearer ${bob}`);
    expect(stranger.status).toBe(404);
  }, 20000);

  it('routes admin réservées au rôle admin (via users.role)', async () => {
    const denied = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${alice}`);
    expect(denied.status).toBe(403);

    // Passage admin : rôle en base (comme le script set-admin), puis re-login
    await registerUser('Root', 'root@example.com');
    const { db } = await import('../lib/firebase.js');
    const pointer = await db.collection('user_emails').doc('root@example.com').get();
    await db.collection('users').doc(pointer.data()!.uid).update({ role: 'admin' });

    const relog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'root@example.com', password: 'motdepasse-solide' });
    const allowed = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${relog.body.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.sites).toBeGreaterThanOrEqual(1);
  });
});
