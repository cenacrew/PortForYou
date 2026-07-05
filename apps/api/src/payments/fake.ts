import crypto from 'node:crypto';
import type { PaymentDriver, CheckoutInput, CheckoutResult } from './driver.js';
import { config } from '../config.js';

/**
 * Driver de paiement simulé pour le dev local : le "checkout" est une page de
 * la vitrine qui confirme la commande via POST /api/v1/payments/fake/confirm.
 */
export const fakePaymentDriver: PaymentDriver = {
  name: 'fake',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const sessionId = `fake_${crypto.randomUUID()}`;
    const checkoutUrl = `${config.WEB_ORIGIN}/order/fake-checkout?orderId=${encodeURIComponent(input.orderId)}&session=${sessionId}`;
    return { checkoutUrl, sessionId };
  },

  async createBillingPortal(): Promise<string> {
    return `${config.WEB_ORIGIN}/dashboard/billing/fake-portal`;
  },
};
