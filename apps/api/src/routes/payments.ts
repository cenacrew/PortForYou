import { Router, raw, json } from 'express';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ordersCol, sitesCol, stripeEventsCol } from '../lib/firebase.js';
import { confirmPaidOrder } from '../orders/service.js';
import { getStripe } from '../payments/stripe.js';
import { config } from '../config.js';
import { sendError } from '../lib/apiError.js';

const router: Router = Router();

/**
 * POST /api/v1/stripe/webhook — endpoint public Stripe.
 * Monté AVANT express.json() (signature vérifiée sur le raw body).
 */
router.post('/stripe/webhook', raw({ type: 'application/json' }), async (req, res) => {
  if (config.PAYMENT_DRIVER !== 'stripe') {
    return sendError(res, 400, 'stripe_disabled', 'Stripe non activé (PAYMENT_DRIVER=fake)');
  }
  if (!config.STRIPE_WEBHOOK_SECRET) {
    return sendError(res, 500, 'webhook_secret_missing', 'STRIPE_WEBHOOK_SECRET manquant');
  }

  let event;
  try {
    const signature = req.headers['stripe-signature'] as string;
    event = getStripe().webhooks.constructEvent(req.body, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch {
    return sendError(res, 400, 'invalid_signature', 'Signature invalide');
  }

  // Idempotence : chaque événement Stripe n'est traité qu'une fois. `.create()`
  // échoue atomiquement si le doc existe déjà — contrairement à un
  // get()-puis-set(), ça tient même si Stripe redélivre le même event.id en
  // concurrence (retry réseau, double webhook).
  const eventRef = stripeEventsCol().doc(event.id);
  try {
    await eventRef.create({ type: event.type, createdAt: FieldValue.serverTimestamp() });
  } catch {
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) await confirmPaidOrder(orderId);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const uid = subscription.metadata?.uid;
        if (uid && event.type === 'customer.subscription.deleted') {
          const sites = await sitesCol().where('uid', '==', uid).get();
          const batch = sitesCol().firestore.batch();
          sites.docs.forEach((doc) => batch.update(doc.ref, { status: 'suspended' }));
          await batch.commit();
        }
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error(`Webhook ${event.type} en erreur:`, err);
    return sendError(res, 500, 'webhook_processing_failed', 'Traitement échoué');
  }
});

/**
 * POST /api/v1/payments/fake/confirm — équivalent local du webhook Stripe.
 * Actif uniquement avec PAYMENT_DRIVER=fake ; l'utilisateur authentifié
 * confirme SA propre commande (page fake-checkout de la vitrine).
 */
router.post(
  '/payments/fake/confirm',
  // Ce router est monté avant express.json() (raw body du webhook Stripe) :
  // cette route parse donc son JSON elle-même.
  json(),
  requireAuth,
  validateBody(z.object({ orderId: z.string().min(1) })),
  async (req, res) => {
    if (config.PAYMENT_DRIVER !== 'fake') {
      return sendError(res, 403, 'fake_payment_disabled', 'Paiement simulé désactivé');
    }
    const order = (await ordersCol().doc(req.body.orderId).get()).data();
    if (!order || order.uid !== req.user!.uid) {
      return sendError(res, 404, 'order_not_found', 'Commande introuvable');
    }
    const { siteId } = await confirmPaidOrder(req.body.orderId);
    return res.json({ ok: true, siteId });
  },
);

export default router;
