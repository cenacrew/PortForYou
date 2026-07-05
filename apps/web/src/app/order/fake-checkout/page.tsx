'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import styles from '../order.module.css';

/**
 * Page de paiement simulé (PAYMENT_DRIVER=fake, dev/démo uniquement).
 * Joue le rôle du Stripe Checkout : confirme la commande côté API.
 */
function FakeCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get('orderId') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ siteId: string }>('/payments/fake/confirm', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      router.push(`/dashboard/sites/${res.siteId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={`container ${styles.wrap}`}>
      <p className="cartel">Paiement de démonstration — aucun débit réel</p>
      <h1 className={styles.title}>Simuler le paiement</h1>
      <dl className={styles.summary}>
        <div className={styles.summaryRow}>
          <dt>Commande</dt>
          <dd style={{ fontFamily: 'var(--font-cartel)' }}>{orderId || '—'}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Montant</dt>
          <dd>6,60 € / mois + consommation (test)</dd>
        </div>
      </dl>
      {error && <p className="error-text">{error}</p>}
      <div className={styles.nav}>
        <button className="btn" onClick={() => router.push('/order')}>
          Annuler
        </button>
        <button className="btn btn-primary" disabled={busy || !orderId} onClick={confirm}>
          {busy ? 'Paiement…' : 'Payer 6,60 €'}
        </button>
      </div>
    </div>
  );
}

export default function FakeCheckoutPage() {
  return (
    <Suspense>
      <FakeCheckout />
    </Suspense>
  );
}
