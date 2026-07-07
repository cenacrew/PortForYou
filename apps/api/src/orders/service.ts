import { FieldValue } from 'firebase-admin/firestore';
import { tenantFrontUrl } from '@portforyou/shared';
import { db, ordersCol, sitesCol, slugsCol } from '../lib/firebase.js';
import { dispatchProvisioning } from '../provisioning/pipeline.js';
import { sendMail, orderConfirmationEmail } from '../emails/mailer.js';

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
 * provisioning en tâche de fond. Idempotent (rejouable par le webhook) —
 * le read-check-create est fait dans une transaction Firestore pour rester
 * atomique même si deux appels concurrents arrivent pour la même commande
 * (rejeu de webhook Stripe, double clic sur la confirmation fake en local).
 */
export async function confirmPaidOrder(orderId: string): Promise<{ siteId: string }> {
  const orderRef = ordersCol().doc(orderId);
  const siteRef = sitesCol().doc(); // id pré-généré, utilisé seulement si créé cette fois

  const result = await db.runTransaction(async (tx) => {
    const order = (await tx.get(orderRef)).data();
    if (!order) throw new Error(`Commande ${orderId} introuvable`);

    // Idempotence : si un site existe déjà pour cette commande, ne rien refaire.
    if (order.siteId) return { created: false as const, siteId: order.siteId as string, order };

    tx.set(siteRef, {
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
    tx.update(orderRef, {
      status: 'paid',
      siteId: siteRef.id,
      paidAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      slugsCol().doc(order.siteSlug),
      { status: 'confirmed', uid: order.uid, siteId: siteRef.id },
      { merge: true },
    );
    return { created: true as const, siteId: siteRef.id, order };
  });

  if (result.created) {
    const mail = orderConfirmationEmail(result.order.artistName, result.order.siteSlug);
    await sendMail({ to: result.order.clientEmail, type: 'order_confirmed', ...mail });
    await dispatchProvisioning(result.siteId, result.order.uid, 'order');
  }

  return { siteId: result.siteId };
}
