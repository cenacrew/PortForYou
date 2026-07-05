import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { orderCreateSchema } from '@portforyou/shared';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ordersCol, sitesCol } from '../lib/firebase.js';
import { reserveSlug } from '../orders/service.js';
import { getPaymentDriver } from '../payments/index.js';
import { config } from '../config.js';

const router: Router = Router();

/** POST /api/v1/orders — crée la commande + la session de paiement. */
router.post('/orders', requireAuth, validateBody(orderCreateSchema), async (req, res) => {
  const user = req.user!;
  const { templateSlug, siteSlug, artistName, contactEmail } = req.body;

  if (config.REQUIRE_VERIFIED_EMAIL && !user.emailVerified) {
    return res.status(403).json({
      error: 'Vérifiez votre adresse email avant de commander.',
    });
  }

  // Anti-abus : nombre de sites par compte plafonné.
  const existing = await sitesCol().where('uid', '==', user.uid).count().get();
  if (existing.data().count >= config.MAX_SITES_PER_USER) {
    return res
      .status(403)
      .json({ error: `Limite de ${config.MAX_SITES_PER_USER} sites par compte atteinte` });
  }

  const orderRef = ordersCol().doc();
  try {
    await reserveSlug(siteSlug, user.uid, orderRef.id);
  } catch (err) {
    if (err instanceof Error && err.message === 'SLUG_TAKEN') {
      return res.status(409).json({ error: 'Ce nom de site est déjà pris' });
    }
    throw err;
  }

  await orderRef.set({
    uid: user.uid,
    clientEmail: user.email,
    templateSlug,
    siteSlug,
    artistName,
    contactEmail,
    status: 'pending_payment',
    createdAt: FieldValue.serverTimestamp(),
  });

  const checkout = await getPaymentDriver().createCheckout({
    orderId: orderRef.id,
    uid: user.uid,
    email: user.email,
    siteSlug,
    templateSlug,
  });

  await orderRef.update({ sessionId: checkout.sessionId });
  return res.status(201).json({ orderId: orderRef.id, checkoutUrl: checkout.checkoutUrl });
});

export default router;
