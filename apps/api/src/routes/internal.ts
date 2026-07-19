import { Router, json, type Request, type Response, type NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { runProvisioning } from '../provisioning/pipeline.js';
import { getProvisionerDriver } from '../provisioning/index.js';
import { config } from '../config.js';
import { sendError } from '../lib/apiError.js';

const router: Router = Router();
const oidcClient = new OAuth2Client();

/**
 * Réservé à Cloud Tasks : vérifie le token OIDC (audience = URL publique de
 * l'API, émetteur Google, service account attendu).
 */
async function requireCloudTasksOidc(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const ticket = await oidcClient.verifyIdToken({
      idToken: token,
      audience: config.API_PUBLIC_URL,
    });
    const email = ticket.getPayload()?.email;
    if (!email || email !== config.TASKS_SERVICE_ACCOUNT) {
      return sendError(res, 403, 'oidc_service_account_forbidden', 'Service account non autorisé');
    }
    next();
  } catch {
    return sendError(res, 401, 'oidc_invalid', 'Token OIDC invalide');
  }
}

router.post(
  '/internal/provision',
  json(),
  requireCloudTasksOidc,
  validateBody(z.object({ siteId: z.string().min(1), deployId: z.string().min(1) })),
  async (req, res) => {
    const driver = await getProvisionerDriver();
    // Exécution synchrone : Cloud Tasks attend la fin (deadline 15 min) et
    // rejoue en cas d'échec HTTP.
    await runProvisioning(driver, req.body.siteId, req.body.deployId);
    res.json({ ok: true });
  },
);

/**
 * Health checks des sites live — appelé par Cloud Scheduler (OIDC) toutes
 * les 10 minutes. Met à jour sites/{id}.health pour le dashboard admin.
 */
router.post('/internal/health-checks', requireCloudTasksOidc, async (_req, res) => {
  const { sitesCol } = await import('../lib/firebase.js');
  const sites = await sitesCol().where('status', '==', 'live').get();

  const results = await Promise.all(
    sites.docs.map(async (doc) => {
      const front = doc.data().urls?.front as string | undefined;
      if (!front) return null;
      const started = Date.now();
      let status = 'down';
      try {
        const ping = await fetch(`${front}/api/v1/health`, {
          signal: AbortSignal.timeout(10000),
        });
        if (ping.ok) status = 'up';
      } catch {
        /* down */
      }
      const latencyMs = Date.now() - started;
      await doc.ref.update({
        health: { status, latencyMs, checkedAt: new Date().toISOString() },
      });
      return { slug: doc.data().slug, status, latencyMs };
    }),
  );
  res.json({ checked: results.filter(Boolean) });
});

/**
 * Purge des réservations de slugs expirées — Cloud Scheduler (1 h).
 * Une réservation expirée peut avoir laissé un site Firebase Hosting réel et
 * vide (créé comme effet de bord de `checkHostingNameAvailable` à la
 * réservation du slug, avant tout paiement — cf. docs/ARCHITECTURE.md §6).
 * `driver.deprovision` est donc appelé avant de libérer le slug : il nettoie
 * ce site orphelin (et no-op partout ailleurs, puisqu'aucune autre ressource
 * n'a été créée pour une simple réservation jamais payée). Un slug dont le
 * deprovision échoue reste en `reserved` expiré : il sera retenté au prochain
 * passage (requête stateless sur `reservedAt`), sans jamais bloquer la purge
 * des autres.
 */
router.post('/internal/cleanup-slugs', requireCloudTasksOidc, async (_req, res) => {
  const { slugsCol } = await import('../lib/firebase.js');
  const driver = await getProvisionerDriver();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await slugsCol()
    .where('status', '==', 'reserved')
    .where('reservedAt', '<', cutoff)
    .get();

  const results = await Promise.allSettled(
    stale.docs.map(async (doc) => {
      await driver.deprovision(doc.id);
      await doc.ref.delete();
    }),
  );

  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const slug = stale.docs[i]!.id;
      console.error(`cleanup-slugs deprovision ${slug}:`, r.reason);
      failed.push(slug);
    }
  });
  res.json({ purged: results.length - failed.length, failed });
});

/**
 * Cycle de facturation — Cloud Scheduler, le 1er du mois : estime la
 * consommation du mois écoulé de chaque site live, archive le détail et
 * pousse l'usage sur le meter Stripe (1 unité = 1 centime d'infra).
 */
router.post('/internal/billing-cycle', requireCloudTasksOidc, async (_req, res) => {
  const { sitesCol, usersCol } = await import('../lib/firebase.js');
  const { estimateTenantCost } = await import('../billing/estimate.js');
  const { config } = await import('../config.js');

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthKey = start.toISOString().slice(0, 7);

  const sites = await sitesCol().where('status', '==', 'live').get();
  const results: Array<Record<string, unknown>> = [];

  for (const doc of sites.docs) {
    const site = doc.data();
    try {
      const cost = await estimateTenantCost(site.slug, start, end);
      await doc.ref.set({ billing: { [monthKey]: cost } }, { merge: true });

      // Report d'usage Stripe (meter pfy_infra), si le vrai Stripe est branché.
      if (config.PAYMENT_DRIVER === 'stripe') {
        const user = await usersCol().doc(site.uid).get();
        const customerId = user.data()?.stripeCustomerId as string | undefined;
        if (customerId) {
          const { getStripe } = await import('../payments/stripe.js');
          await getStripe().billing.meterEvents.create({
            event_name: 'pfy_infra',
            payload: {
              stripe_customer_id: customerId,
              value: String(Math.round(cost.totalEur * 100)), // centimes d'infra
            },
          });
        }
      }
      results.push({ slug: site.slug, month: monthKey, infraEur: cost.totalEur });
    } catch (err) {
      console.error(`billing-cycle ${site.slug}:`, err);
      results.push({ slug: site.slug, error: String(err) });
    }
  }
  res.json({ month: monthKey, sites: results });
});

/**
 * Rotation périodique du JWT_SECRET des tenants live — Cloud Scheduler
 * (trimestriel). Le mot de passe admin n'est jamais touché (rotation
 * manuelle uniquement, via le dashboard client).
 */
router.post('/internal/rotate-secrets', requireCloudTasksOidc, async (_req, res) => {
  const { sitesCol } = await import('../lib/firebase.js');
  const driver = await getProvisionerDriver();
  const sites = await sitesCol().where('status', '==', 'live').get();

  const results = await Promise.allSettled(
    sites.docs.map((doc) => driver.rotateJwtSecret(doc.data().slug as string)),
  );
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const slug = sites.docs[i]!.data().slug as string;
      console.error(`rotate-secrets ${slug}:`, r.reason);
      failed.push(slug);
    }
  });
  res.json({ rotated: results.length - failed.length, failed });
});

export default router;
