import Link from 'next/link';
import { useTranslations } from 'next-intl';

/** Retour du Stripe Checkout réel (mode test). */
export default function OrderSuccess() {
  const t = useTranslations('OrderSuccess');
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
        <h1
          className="display"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: '1rem' }}
        >
          {t('title')}
        </h1>
        <p style={{ marginBottom: '2rem' }}>{t('message')}</p>
        <Link href="/dashboard" className="btn btn-primary">
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
