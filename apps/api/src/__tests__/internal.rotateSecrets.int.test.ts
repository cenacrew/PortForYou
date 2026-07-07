/**
 * Rotation périodique du JWT_SECRET des tenants (endpoint interne, appelé par
 * Cloud Scheduler). Intégration contre l'émulateur Firestore ; l'OIDC de
 * Cloud Tasks/Scheduler est mocké (impossible d'obtenir un vrai token Google
 * en test), le driver de provisioning est remplacé par un espion.
 *
 * Ne purge PAS l'émulateur (partagé avec les autres suites *.int.test.ts qui
 * tournent en parallèle) : les assertions portent uniquement sur des slugs
 * uniques créés par ce fichier, jamais sur un compte global.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeIf = hasEmulator ? describe : describe.skip;

const FAKE_TOKEN = 'fake-token-verifie-par-le-mock';
const rotateJwtSecret = vi.fn().mockResolvedValue(undefined);

vi.mock('google-auth-library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('google-auth-library')>();
  return {
    ...actual,
    OAuth2Client: class {
      async verifyIdToken({ idToken }: { idToken: string }) {
        if (idToken !== FAKE_TOKEN) throw new Error('token invalide');
        return { getPayload: () => ({ email: 'pfy-api@portforyou-vsp.iam.gserviceaccount.com' }) };
      }
    },
  };
});

vi.mock('../provisioning/index.js', () => ({
  getProvisionerDriver: async () => ({ rotateJwtSecret }),
}));

let app: import('express').Express;
let db: import('firebase-admin/firestore').Firestore;

beforeAll(async () => {
  app = (await import('../app.js')).default;
  ({ db } = await import('../lib/firebase.js'));
}, 60000);

describeIf('POST /internal/rotate-secrets (émulateur Firestore)', () => {
  it('rejette sans token OIDC', async () => {
    const res = await request(app).post('/internal/rotate-secrets');
    expect(res.status).toBe(401);
    expect(rotateJwtSecret).not.toHaveBeenCalled();
  });

  it('rejette un token OIDC invalide', async () => {
    const res = await request(app)
      .post('/internal/rotate-secrets')
      .set('Authorization', 'Bearer un-token-quelconque');
    expect(res.status).toBe(401);
  });

  it('fait tourner le JWT_SECRET de chaque site live, ignore les autres statuts', async () => {
    await db.collection('sites').add({ slug: 'rotest-atelier-alice', status: 'live' });
    await db.collection('sites').add({ slug: 'rotest-atelier-bob', status: 'live' });
    await db.collection('sites').add({ slug: 'rotest-atelier-en-cours', status: 'provisioning' });
    await db.collection('sites').add({ slug: 'rotest-atelier-suspendu', status: 'suspended' });

    const res = await request(app)
      .post('/internal/rotate-secrets')
      .set('Authorization', `Bearer ${FAKE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.failed).toEqual([]);
    expect(rotateJwtSecret).toHaveBeenCalledWith('rotest-atelier-alice');
    expect(rotateJwtSecret).toHaveBeenCalledWith('rotest-atelier-bob');
    expect(rotateJwtSecret).not.toHaveBeenCalledWith('rotest-atelier-en-cours');
    expect(rotateJwtSecret).not.toHaveBeenCalledWith('rotest-atelier-suspendu');
  });

  it('reporte les échecs par tenant sans faire échouer les autres', async () => {
    rotateJwtSecret.mockReset();
    rotateJwtSecret.mockImplementation(async (slug: string) => {
      if (slug === 'rotest-atelier-cassee') throw new Error('Secret Manager indisponible');
    });

    await db.collection('sites').add({ slug: 'rotest-atelier-ok', status: 'live' });
    await db.collection('sites').add({ slug: 'rotest-atelier-cassee', status: 'live' });

    const res = await request(app)
      .post('/internal/rotate-secrets')
      .set('Authorization', `Bearer ${FAKE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.failed).toContain('rotest-atelier-cassee');
    expect(res.body.failed).not.toContain('rotest-atelier-ok');
  });
});
