'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';
import { useAuth, useAuthActions } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface Site {
  id: string;
  slug: string;
  templateSlug: string;
  artistName: string;
  status: string;
  urls: { front?: string } | null;
  plannedUrl?: string;
  createdAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  live: 'En ligne',
  provisioning: 'Déploiement…',
  error: 'Erreur',
  suspended: 'Suspendu',
};

function Dashboard() {
  const { user } = useAuth();
  const { logout, resendVerification } = useAuthActions();
  const router = useRouter();
  const [sites, setSites] = useState<Site[] | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [verifSent, setVerifSent] = useState(false);

  useEffect(() => {
    api<{ items: Site[] }>('/me/sites')
      .then((res) => setSites(res.items))
      .catch(() => setSites([]));
  }, []);

  const openBilling = async () => {
    setBillingBusy(true);
    try {
      const { url } = await api<{ url: string }>('/me/billing/portal');
      window.location.href = url;
    } catch {
      setBillingBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Mes sites</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/dashboard/profile" className="cartel">
              {user?.email}
            </Link>
            <button
              className={`btn ${styles.btnSmall}`}
              onClick={openBilling}
              disabled={billingBusy}
            >
              Facturation
            </button>
            <button
              className={`btn ${styles.btnSmall}`}
              onClick={async () => {
                await logout();
                router.push('/');
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>

        {user && !user.emailVerified && (
          <div
            className="cartel"
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.8rem 1rem',
              marginBottom: '1.5rem',
              border: '1px solid currentColor',
              borderRadius: '0.4rem',
            }}
          >
            <span>Confirmez votre adresse email pour profiter de toutes les fonctionnalités.</span>
            <button
              className={`btn ${styles.btnSmall}`}
              disabled={verifSent}
              onClick={() => resendVerification().then(() => setVerifSent(true))}
            >
              {verifSent ? 'Email envoyé' : "Renvoyer l'email"}
            </button>
          </div>
        )}

        {sites === null ? (
          <p className="cartel">Chargement…</p>
        ) : sites.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              display: 'grid',
              gap: '1.2rem',
              justifyItems: 'center',
              padding: '3rem 0',
            }}
          >
            <p className="display" style={{ fontSize: '1.8rem' }}>
              Votre premier portfolio vous attend.
            </p>
            <Link href="/order" className="btn btn-primary">
              Créer mon portfolio
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {sites.map((site) => (
              <Link key={site.id} href={`/dashboard/sites/${site.id}`} className={styles.card}>
                <span className={styles.status} data-status={site.status}>
                  {STATUS_LABELS[site.status] ?? site.status}
                </span>
                <h3>{site.artistName}</h3>
                <p className={styles.mono}>{site.urls?.front ?? site.plannedUrl}</p>
                <p className={styles.meta}>
                  Template {site.templateSlug} — créé le{' '}
                  {site.createdAt ? new Date(site.createdAt).toLocaleDateString('fr-FR') : '—'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
