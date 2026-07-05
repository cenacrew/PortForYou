import Stripe from 'stripe';
import type { PaymentDriver, CheckoutInput, CheckoutResult } from './driver.js';
import { config } from '../config.js';
import { usersCol } from '../lib/firebase.js';

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!config.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant');
    stripeClient = new Stripe(config.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

async function getOrCreateCustomer(uid: string, email: string): Promise<string> {
  const userRef = usersCol().doc(uid);
  const snap = await userRef.get();
  const existing = snap.data()?.stripeCustomerId as string | undefined;
  if (existing) return existing;

  const customer = await getStripe().customers.create({ email, metadata: { uid } });
  await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer.id;
}

/** Stripe en mode test : abonnement mensuel via Checkout hébergé. */
export const stripePaymentDriver: PaymentDriver = {
  name: 'stripe',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!config.STRIPE_PRICE_BASE || !config.STRIPE_PRICE_DOMAIN || !config.STRIPE_PRICE_INFRA) {
      throw new Error('Prix Stripe manquants — lancer `pnpm stripe-setup`');
    }
    const customerId = await getOrCreateCustomer(input.uid, input.email);

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      // Tarification transparente : 5 € + 10 %, domaine 1 € + 10 %,
      // + consommation d'infra réelle (metered, reportée chaque mois).
      line_items: [
        { price: config.STRIPE_PRICE_BASE, quantity: 1 },
        { price: config.STRIPE_PRICE_DOMAIN, quantity: 1 },
        { price: config.STRIPE_PRICE_INFRA },
      ],
      success_url: `${config.WEB_ORIGIN}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.WEB_ORIGIN}/order?cancelled=1`,
      metadata: {
        orderId: input.orderId,
        uid: input.uid,
        siteSlug: input.siteSlug,
        templateSlug: input.templateSlug,
      },
      // Répliquées sur l'objet subscription : les webhooks
      // customer.subscription.* s'appuient sur metadata.uid.
      subscription_data: {
        metadata: { uid: input.uid, siteSlug: input.siteSlug, orderId: input.orderId },
      },
    });

    if (!session.url) throw new Error('Stripe n’a pas retourné d’URL de checkout');
    return { checkoutUrl: session.url, sessionId: session.id };
  },

  async createBillingPortal(uid: string, email: string): Promise<string> {
    const customerId = await getOrCreateCustomer(uid, email);
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.WEB_ORIGIN}/dashboard`,
    });
    return portal.url;
  },
};
