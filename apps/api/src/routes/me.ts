import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAuthSse } from '../middleware/auth.js';
import { sitesCol, tenantDoc, deploymentsCol } from '../lib/firebase.js';
import { getPaymentDriver } from '../payments/index.js';
import { getProvisionerDriver } from '../provisioning/index.js';
import { sendError } from '../lib/apiError.js';
import { parseDoc } from '../lib/parseDoc.js';
import { storedSiteSchema } from '@portforyou/shared';

const router: Router = Router();

function serializeSite(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    slug: data.slug,
    templateSlug: data.templateSlug,
    artistName: data.artistName,
    status: data.status,
    urls: data.urls ?? null,
    plannedUrl: data.plannedUrl,
    adminEmail: data.adminEmail ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    liveAt: data.liveAt?.toDate?.()?.toISOString() ?? null,
  };
}

/** Vérifie que le site appartient au user connecté. */
async function ownedSite(req: Request, siteId: string) {
  const snap = await sitesCol().doc(siteId).get();
  if (!snap.exists || snap.data()!.uid !== req.user!.uid) return null;
  return snap;
}

router.use('/me', (req, res, next) => {
  // Le flux SSE gère sa propre auth (token en query, EventSource oblige).
  if (req.path.endsWith('/deployments/stream')) return next();
  return requireAuth(req, res, next);
});

router.get('/me/sites', async (req, res) => {
  const snap = await sitesCol().where('uid', '==', req.user!.uid).get();
  const items = snap.docs
    .map((doc) => serializeSite(doc.id, parseDoc(storedSiteSchema, doc, 'sites')))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  res.json({ items });
});

router.get('/me/sites/:id', async (req, res) => {
  const snap = await ownedSite(req, req.params.id);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');

  const deployments = await deploymentsCol().where('siteId', '==', req.params.id).get();
  const lastDeployment = deployments.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
    }))
    .sort((a, b) =>
      ((b.createdAt as string) ?? '').localeCompare((a.createdAt as string) ?? ''),
    )[0];

  return res.json({
    site: serializeSite(snap.id, parseDoc(storedSiteSchema, snap, 'sites')),
    lastDeployment: lastDeployment ?? null,
  });
});

/** Régénère le mot de passe back-office du tenant et redéploie sa config. */
router.post('/me/sites/:id/regenerate-password', async (req, res) => {
  const snap = await ownedSite(req, req.params.id);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');
  const site = snap.data()!;
  if (site.status !== 'live') {
    return sendError(res, 409, 'site_not_live', 'Le site doit être en ligne');
  }

  const password = crypto.randomBytes(9).toString('base64url');
  await (
    await getProvisionerDriver()
  ).storeSecrets({
    slug: site.slug,
    templateSlug: site.templateSlug,
    adminEmail: site.adminEmail,
    adminPasswordHash: bcrypt.hashSync(password, 10),
    jwtSecret: crypto.randomBytes(32).toString('hex'),
  });
  await (
    await getProvisionerDriver()
  ).deployBackend({
    slug: site.slug,
    templateSlug: site.templateSlug,
    adminEmail: site.adminEmail,
    adminPasswordHash: '',
    jwtSecret: '',
  });

  // Retourné une seule fois, jamais stocké en clair.
  return res.json({ ok: true, password });
});

/**
 * Relance le déploiement d'un site en échec, sur le MÊME slug. Reprend le
 * pipeline idempotent depuis le début (les étapes déjà réussies sont
 * réutilisées/patchées, celle qui avait échoué est rejouée) et renvoie l'id
 * du nouveau déploiement à suivre en temps réel.
 */
router.post('/me/sites/:id/retry', async (req, res) => {
  const snap = await ownedSite(req, req.params.id);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');
  const site = snap.data()!;
  if (site.status !== 'error') {
    return sendError(
      res,
      409,
      'site_not_in_error',
      'Seuls les sites en échec peuvent être relancés',
    );
  }

  const { dispatchProvisioning } = await import('../provisioning/pipeline.js');
  await snap.ref.update({ status: 'provisioning' });
  const deploymentId = await dispatchProvisioning(req.params.id, req.user!.uid, 'retry');
  return res.json({ ok: true, deploymentId });
});

/** Agrégats analytics du tenant (lus depuis tenants/{slug}/analytics_daily). */
router.get('/me/sites/:id/analytics', async (req, res) => {
  const snap = await ownedSite(req, req.params.id);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');

  const range = req.query.range === '7d' ? 7 : 30;
  const since = new Date(Date.now() - range * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const daily = await tenantDoc(snap.data()!.slug)
    .collection('analytics_daily')
    .where('__name__', '>=', since)
    .get();

  const days = daily.docs.map((doc) => {
    const data = doc.data();
    return {
      date: doc.id,
      pageViews: data.pageViews ?? 0,
      uniques: Array.isArray(data.visitors) ? data.visitors.length : 0,
      paths: data.paths ?? {},
      artworkViews: data.artworkViews ?? {},
    };
  });

  const totals = days.reduce(
    (acc, day) => {
      acc.pageViews += day.pageViews;
      acc.uniques += day.uniques;
      for (const [path, count] of Object.entries(day.paths)) {
        acc.topPaths[path] = (acc.topPaths[path] ?? 0) + (count as number);
      }
      for (const [artworkId, count] of Object.entries(day.artworkViews)) {
        acc.topArtworks[artworkId] = (acc.topArtworks[artworkId] ?? 0) + (count as number);
      }
      return acc;
    },
    {
      pageViews: 0,
      uniques: 0,
      topPaths: {} as Record<string, number>,
      topArtworks: {} as Record<string, number>,
    },
  );

  return res.json({ range: `${range}d`, days, totals });
});

/**
 * SSE : pousse en temps réel le dernier déploiement du site (écoute
 * Firestore côté serveur via l'Admin SDK — le navigateur ne parle
 * jamais à Firestore directement).
 */
router.get('/me/sites/:id/deployments/stream', requireAuthSse, async (req, res) => {
  const siteId = String(req.params.id);
  const snap = await ownedSite(req, siteId);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  const unsubscribe = deploymentsCol()
    .where('siteId', '==', siteId)
    .where('uid', '==', req.user!.uid)
    .onSnapshot(
      (query) => {
        const items = query.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort(
            (a, b) =>
              ((b as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0) -
              ((a as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0),
          );
        send({ deployment: items[0] ?? null });
      },
      (err) => {
        console.error('SSE onSnapshot:', err.message);
        res.end();
      },
    );

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
  return undefined;
});

/** Consommation du mois en cours (estimation transparente) + formule client. */
router.get('/me/sites/:id/billing', async (req, res) => {
  const snap = await ownedSite(req, req.params.id);
  if (!snap) return sendError(res, 404, 'site_not_found', 'Site introuvable');

  const { estimateTenantCost, clientMonthlyTotal, GCP_RATES } =
    await import('../billing/estimate.js');
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const cost = await estimateTenantCost(snap.data()!.slug, start, now);

  return res.json({
    current: cost,
    pricing: {
      baseEur: 5,
      domainEur: 1,
      mcoRate: 0.1,
      projectedTotalEur: clientMonthlyTotal(cost.totalEur),
    },
    rates: GCP_RATES,
    history: snap.data()!.billing ?? {},
  });
});

router.get('/me/billing/portal', async (req, res) => {
  const url = await getPaymentDriver().createBillingPortal(req.user!.uid, req.user!.email);
  res.json({ url });
});

/**
 * GET /api/v1/me/account/export — portabilité RGPD (art. 20) : renvoie en JSON
 * téléchargeable l'intégralité des données personnelles du user authentifié
 * (profil + ses sites + ses commandes). N'expose QUE les données dont le token
 * est propriétaire (filtrées par `uid`) ; aucun secret n'est inclus — ni le
 * hash de mot de passe (`passwordHash`), ni les secrets tenant (Secret Manager).
 */
router.get('/me/account/export', async (req, res) => {
  const uid = req.user!.uid;
  const { usersCol, ordersCol } = await import('../lib/firebase.js');

  const [userSnap, sitesSnap, ordersSnap] = await Promise.all([
    usersCol().doc(uid).get(),
    sitesCol().where('uid', '==', uid).get(),
    ordersCol().where('uid', '==', uid).get(),
  ]);

  const u = userSnap.data() ?? {};
  const profile = {
    uid,
    email: u.email ?? req.user!.email,
    displayName: u.displayName ?? null,
    provider: u.provider ?? null,
    role: u.role ?? 'user',
    emailVerified: u.emailVerified ?? null,
    stripeCustomerId: u.stripeCustomerId ?? null,
    createdAt: u.createdAt?.toDate?.()?.toISOString() ?? null,
  };

  const sites = sitesSnap.docs.map((doc) => serializeSite(doc.id, doc.data()));

  const orders = ordersSnap.docs.map((doc) => {
    const o = doc.data();
    return {
      id: doc.id,
      templateSlug: o.templateSlug ?? null,
      siteSlug: o.siteSlug ?? null,
      artistName: o.artistName ?? null,
      contactEmail: o.contactEmail ?? null,
      status: o.status ?? null,
      createdAt: o.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    format: 'portforyou-account-export-v1',
    profile,
    sites,
    orders,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="portforyou-donnees-${uid}.json"`);
  return res.status(200).send(JSON.stringify(payload, null, 2));
});

/**
 * DELETE /api/v1/me/account — suppression RGPD : révoque toutes les sessions,
 * suspend les sites (purge définitive par l'admin), anonymise le profil.
 * Les données de facturation restent chez Stripe (obligations légales).
 */
router.delete('/me/account', async (req, res) => {
  const uid = req.user!.uid;
  const { usersCol, db } = await import('../lib/firebase.js');
  const { FieldValue } = await import('firebase-admin/firestore');
  const { revokeAllSessions } = await import('../auth/service.js');

  const sites = await sitesCol().where('uid', '==', uid).get();
  const batch = sitesCol().firestore.batch();
  sites.docs.forEach((doc) =>
    batch.update(doc.ref, { status: 'suspended', suspendedAt: FieldValue.serverTimestamp() }),
  );
  batch.set(
    usersCol().doc(uid),
    {
      deletedAt: FieldValue.serverTimestamp(),
      email: FieldValue.delete(),
      displayName: FieldValue.delete(),
    },
    { merge: true },
  );
  await batch.commit();
  await revokeAllSessions(uid);
  await db
    .collection('user_emails')
    .doc(req.user!.email.toLowerCase())
    .delete()
    .catch(() => {});

  return res.json({ ok: true, suspendedSites: sites.size });
});

export default router;
