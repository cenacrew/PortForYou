import type { PaymentDriver } from './driver.js';
import { fakePaymentDriver } from './fake.js';
import { stripePaymentDriver } from './stripe.js';
import { config } from '../config.js';

export function getPaymentDriver(): PaymentDriver {
  return config.PAYMENT_DRIVER === 'stripe' ? stripePaymentDriver : fakePaymentDriver;
}
