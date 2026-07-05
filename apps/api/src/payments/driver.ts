export interface CheckoutInput {
  orderId: string;
  uid: string;
  email: string;
  siteSlug: string;
  templateSlug: string;
}

export interface CheckoutResult {
  /** URL vers laquelle rediriger le client pour payer. */
  checkoutUrl: string;
  /** Identifiant de session côté prestataire de paiement. */
  sessionId: string;
}

export interface PaymentDriver {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** URL du portail de facturation client (factures, annulation). */
  createBillingPortal(uid: string, email: string): Promise<string>;
}
