import { FieldValue } from 'firebase-admin/firestore';
import { tenantFrontUrl } from '@portforyou/shared';
import { db, ordersCol, sitesCol, slugsCol } from '../lib/firebase.js';
import { createDeployment, runProvisioning } from '../provisioning/pipeline.js';
import { getProvisionerDriver } from '../provisioning/index.js';
import { sendMail, orderConfirmationEmail } from '../emails/mailer.js';
import { config } from '../config.js';

/** Durée de validité d'une réservation de slug non payée. */
const SLUG_RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Réserve un slug de façon atomique. Jette si déjà pris. */
export async function reserveSlug(slug: string, uid: string, orderId: string) {
  await db.runTransaction(async (tx) => {
    const ref = slugsCol().doc(slug);
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data = snap.data()!;
      const expired =
        data.status === 'reserved' &&
        data.reservedAt &&
        Date.now() - data.reservedAt.toDate().getTime() > SLUG_RESERVATION_TTL_MS;
      if (!expired && !(data.status === 'reserved' && data.orderId === orderId)) {
        throw new Error('SLUG_TAKEN');
      }
    }
    tx.set(ref, {
      status: 'reserved',
      uid,
      orderId,
      reservedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const snap = await slugsCol().doc(slug).get();
  if (!snap.exists) return true;
  const data = snap.data()!;
  if (data.status === 'confirmed') return false;
  if (data.status === 'reserved' && data.reservedAt) {
    return Date.now() - data.reservedAt.toDate().getTime() > SLUG_RESERVATION_TTL_MS;
  }
  return false;
}

/**
 * Confirme une commande payée : crée le site, le déploiement, et lance le
 * provisioning en tâche de fond. Idempotent (rejouable par le webhook).
 */
export async function confirmPaidOrder(orderId: string): Promise<{ siteId: string }> {
  const orderRef = ordersCol().doc(orderId);
  const order = (await orderRef.get()).data();
  if (!order) throw new Error(`Commande ${orderId} introuvable`);

  // Idempotence : si un site existe déjà pour cette commande, ne rien refaire.
  if (order.siteId) return { siteId: order.siteId };

  const siteRef = await sitesCol().add({
    uid: order.uid,
    slug: order.siteSlug,
    templateSlug: order.templateSlug,
    artistName: order.artistName,
    contactEmail: order.contactEmail,
    clientEmail: order.clientEmail,
    status: 'provisioning',
    plannedUrl: tenantFrontUrl(order.siteSlug),
    createdAt: FieldValue.serverTimestamp(),
  });

  await orderRef.update({
    status: 'paid',
    siteId: siteRef.id,
    paidAt: FieldValue.serverTimestamp(),
  });
  await slugsCol()
    .doc(order.siteSlug)
    .set({ status: 'confirmed', uid: order.uid, siteId: siteRef.id }, { merge: true });

  const deployId = await createDeployment(siteRef.id, order.uid, 'order');

  const mail = orderConfirmationEmail(order.artistName, order.siteSlug);
  await sendMail({ to: order.clientEmail, type: 'order_confirmed', ...mail });

  if (config.PROVISIONING_VIA_TASKS) {
    // Prod : Cloud Tasks rappelle POST /internal/provision (retries, backoff).
    const { enqueueProvisioning } = await import('../provisioning/tasks.js');
    await enqueueProvisioning(siteRef.id, deployId);
  } else {
    // Dev local : le pipeline tourne en tâche de fond dans le process.
    void getProvisionerDriver().then((driver) => runProvisioning(driver, siteRef.id, deployId));
  }

  return { siteId: siteRef.id };
}
