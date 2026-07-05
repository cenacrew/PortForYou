/**
 * Bootstrap Stripe idempotent — crée (ou retrouve) :
 *  - le produit « Portfolio Port'ForYou »
 *  - le meter de consommation d'infrastructure (1 unité = 1 centime d'infra)
 *  - 3 prix : abonnement 5,50 €/mois, domaine 1,10 €/mois,
 *    infra metered à 0,011 €/unité (le ×1,10 de MCO est intégré aux prix)
 *
 * Usage : STRIPE_SECRET_KEY=sk_test_... pnpm --filter @portforyou/api stripe-setup
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY requis');
  process.exit(1);
}
const stripe = new Stripe(key);

// --- Produit ---------------------------------------------------------------
const products = await stripe.products.search({ query: "metadata['pfy']:'portfolio'" });
const product =
  products.data[0] ??
  (await stripe.products.create({
    name: "Portfolio Port'ForYou",
    description: 'Portfolio professionnel pour artiste visuel — abonnement + consommation réelle',
    metadata: { pfy: 'portfolio' },
  }));
console.log(`Produit : ${product.id}`);

// --- Meter de consommation ---------------------------------------------------
const meters = await stripe.billing.meters.list({ status: 'active' });
const meter =
  meters.data.find((m) => m.event_name === 'pfy_infra') ??
  (await stripe.billing.meters.create({
    display_name: 'Infrastructure consommée (centimes)',
    event_name: 'pfy_infra',
    default_aggregation: { formula: 'sum' },
  }));
console.log(`Meter : ${meter.id} (event pfy_infra)`);

// --- Prix (lookup_keys = idempotence) ----------------------------------------
async function ensurePrice(
  lookupKey: string,
  params: Stripe.PriceCreateParams,
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return stripe.prices.create({ ...params, lookup_key: lookupKey });
}

const base = await ensurePrice('pfy_base', {
  product: product.id,
  nickname: 'Abonnement Port’ForYou (5 € + 10 % MCO)',
  currency: 'eur',
  unit_amount: 550,
  recurring: { interval: 'month' },
});

const domain = await ensurePrice('pfy_domain', {
  product: product.id,
  nickname: 'Nom de domaine (1 € + 10 % MCO)',
  currency: 'eur',
  unit_amount: 110,
  recurring: { interval: 'month' },
});

const infra = await ensurePrice('pfy_infra', {
  product: product.id,
  nickname: 'Infrastructure — consommation réelle (+10 % MCO)',
  currency: 'eur',
  billing_scheme: 'per_unit',
  // 1 unité = 1 centime d'infra ; facturé 1,1 centime (MCO inclus)
  unit_amount_decimal: '1.1',
  recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
});

console.log('');
console.log('✅ Variables à poser (env / Secret Manager) :');
console.log(`STRIPE_PRICE_BASE=${base.id}`);
console.log(`STRIPE_PRICE_DOMAIN=${domain.id}`);
console.log(`STRIPE_PRICE_INFRA=${infra.id}`);
process.exit(0);
