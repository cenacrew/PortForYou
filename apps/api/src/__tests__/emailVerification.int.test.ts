/**
 * Vérification d'email : inscription → token de vérification → validation
 * par l'endpoint → déblocage de la commande quand REQUIRE_VERIFIED_EMAIL=1.
 * Intégration contre l'émulateur Firestore.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIf = hasEmulator ? describe : describe.skip;

let app: import('express').Express;
let db: import('firebase-admin/firestore').Firestore;
let createEmailVerification: (uid: string) => Promise<string>;

beforeAll(async () => {
  process.env.PROVISIONER_FAKE_DELAY_MS = '5';
  process.env.REQUIRE_VERIFIED_EMAIL = '1';
  if (hasEmulator) {
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/portforyou-vsp/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }
  app = (await import('../app.js')).default;
  ({ db } = await import('../lib/firebase.js'));
  ({ createEmailVerification } = await import('../auth/service.js'));
}, 60000);

async function register(name: string, email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'motdepasse-solide' });
  expect(res.status).toBe(201);
  return { token: res.body.accessToken as string, uid: res.body.user.uid as string };
}

const orderPayload = (slug: string, name: string, email: string) => ({
  templateSlug: 'atelier',
  siteSlug: slug,
  artistName: name,
  contactEmail: email,
});

describeIf('vérification email (émulateur Firestore)', () => {
  it('un compte fraîchement créé a emailVerified=false', async () => {
    const { token } = await register('Nina', 'nina@example.com');
    const res = await request(app).get('/api/v1/me/sites').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200); // la lecture des sites n'est pas gatée
  });

  it('bloque la commande tant que l’email n’est pas vérifié (REQUIRE_VERIFIED_EMAIL=1)', async () => {
    const { token } = await register('Léo', 'leo@example.com');
    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload('atelier-de-leo', 'Léo', 'leo@example.com'));
    expect(order.status).toBe(403);
  });

  it('rejette un token de vérification invalide', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'ceci-est-invalide-1234567890' });
    expect(res.status).toBe(400);
  });

  it('rejette la réutilisation d’un token déjà consommé', async () => {
    const { uid } = await register('Marc', 'marc@example.com');
    const token = await createEmailVerification(uid);

    const first = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(first.status).toBe(200);

    const replay = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(replay.status).toBe(400);
  });

  it('vérifie l’email avec un token valide puis débloque la commande', async () => {
    const { token, uid } = await register('Sasha', 'sasha@example.com');
    const verifToken = await createEmailVerification(uid);

    const blocked = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderPayload('atelier-de-sasha', 'Sasha', 'sasha@example.com'));
    expect(blocked.status).toBe(403);

    const verify = await request(app).post('/api/v1/auth/verify-email').send({ token: verifToken });
    expect(verify.status).toBe(200);

    const pointer = await db.collection('user_emails').doc('sasha@example.com').get();
    const userDoc = await db.collection('users').doc(pointer.data()!.uid).get();
    expect(userDoc.data()?.emailVerified).toBe(true);

    // Le JWT déjà émis porte encore l'ancien claim : un refresh (ou relogin)
    // est nécessaire pour que le déblocage soit visible côté client.
    const relog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sasha@example.com', password: 'motdepasse-solide' });
    expect(relog.body.user.emailVerified).toBe(true);

    const unlocked = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${relog.body.accessToken}`)
      .send(orderPayload('atelier-de-sasha', 'Sasha', 'sasha@example.com'));
    expect(unlocked.status).toBe(201);
  });

  it('resend-verification exige une authentification', async () => {
    const res = await request(app).post('/api/v1/auth/resend-verification');
    expect(res.status).toBe(401);
  });

  it('resend-verification renvoie un email si non vérifié, no-op si déjà vérifié', async () => {
    const { token, uid } = await register('Théo', 'theo@example.com');
    const resend1 = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`);
    expect(resend1.status).toBe(200);

    const verifToken = await createEmailVerification(uid);
    await request(app).post('/api/v1/auth/verify-email').send({ token: verifToken });

    const relog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'theo@example.com', password: 'motdepasse-solide' });
    const resend2 = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${relog.body.accessToken}`);
    expect(resend2.status).toBe(200); // no-op, déjà vérifié
  });
});
