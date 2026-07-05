import Link from 'next/link';

/** Retour du Stripe Checkout réel (mode test). */
export default function OrderSuccess() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
        <h1
          className="display"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: '1rem' }}
        >
          Merci, c’est parti.
        </h1>
        <p style={{ marginBottom: '2rem' }}>
          Votre paiement est confirmé : le déploiement de votre portfolio démarre. Suivez sa
          progression en direct depuis votre espace.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Suivre mon déploiement
        </Link>
      </div>
    </section>
  );
}
