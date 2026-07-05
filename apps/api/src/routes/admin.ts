import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { usersCol, sitesCol, deploymentsCol, ordersCol, slugsCol } from '../lib/firebase.js';
import { createDeployment, runProvisioning } from '../provisioning/pipeline.js';
import { getProvisionerDriver } from '../provisioning/index.js';

const router: Router = Router();
router.use(requireAuth, requireAdmin);

router.get('/admin/overview', async (_req, res) => {
  const [users, sites, deployments] = await Promise.all([
    usersCol().count().get(),
    sitesCol().get(),
    deploymentsCol().where('status', '==', 'failed').count().get(),
  ]);
  const byStatus: Record<string, number> = {};
  sites.docs.forEach((doc) => {
    const status = doc.data().status as string;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  });
  res.json({
    clients: users.data().count,
    sites: sites.size,
    sitesByStatus: byStatus,
    failedDeployments: deployments.data().count,
  });
});

router.get('/admin/clients', async (_req, res) => {
  const snap = await usersCol().get();
  res.json({
    items: snap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    })),
  });
});

router.get('/admin/sites', async (_req, res) => {
  const snap = await sitesCol().get();
  res.json({
    items: snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      liveAt: doc.data().liveAt?.toDate?.()?.toISOString() ?? null,
    })),
  });
});

router.get('/admin/deployments', async (_req, res) => {
  const snap = await deploymentsCol().get();
  const items = snap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))
    .sort((a, b) => ((b.createdAt as string) ?? '').localeCompare((a.createdAt as string) ?? ''));
  res.json({ items });
});

router.get('/admin/orders', async (_req, res) => {
  const snap = await ordersCol().get();
  res.json({
    items: snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    })),
  });
});

router.post('/admin/sites/:id/redeploy', async (req, res) => {
  const snap = await sitesCol().doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Site introuvable' });

  await snap.ref.update({ status: 'provisioning' });
  const deployId = await createDeployment(snap.id, snap.data()!.uid, 'redeploy');
  void getProvisionerDriver().then((driver) => runProvisioning(driver, snap.id, deployId));
  return res.json({ ok: true, deployId });
});

router.post('/admin/deployments/:id/retry', async (req, res) => {
  const snap = await deploymentsCol().doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Déploiement introuvable' });
  const { siteId, uid } = snap.data()!;

  await sitesCol().doc(siteId).update({ status: 'provisioning' });
  const deployId = await createDeployment(siteId, uid, 'retry');
  void getProvisionerDriver().then((driver) => runProvisioning(driver, siteId, deployId));
  return res.json({ ok: true, deployId });
});

router.post('/admin/sites/:id/suspend', async (req, res) => {
  const ref = sitesCol().doc(req.params.id);
  if (!(await ref.get()).exists) return res.status(404).json({ error: 'Site introuvable' });
  await ref.update({ status: 'suspended', suspendedAt: FieldValue.serverTimestamp() });
  return res.json({ ok: true });
});

router.delete('/admin/sites/:id', async (req, res) => {
  const snap = await sitesCol().doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Site introuvable' });
  const slug = snap.data()!.slug as string;

  await (await getProvisionerDriver()).deprovision(slug);
  await slugsCol().doc(slug).delete();
  await snap.ref.delete();
  // Les données tenants/{slug} sont purgées par le driver (deprovision).
  return res.json({ ok: true });
});

export default router;
