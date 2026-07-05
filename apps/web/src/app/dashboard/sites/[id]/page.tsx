'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { DeploymentTimeline } from '@/components/DeploymentTimeline';
import { api } from '@/lib/api';
import styles from '../../dashboard.module.css';

interface SiteDetail {
  site: {
    id: string;
    slug: string;
    artistName: string;
    templateSlug: string;
    status: string;
    urls: { front?: string; backOffice?: string } | null;
    plannedUrl?: string;
    adminEmail: string | null;
  };
}

interface Billing {
  current: {
    computeEur: number;
    requestsEur: number;
    storageEur: number;
    egressEur: number;
    totalEur: number;
    method: string;
    period: { start: string; end: string };
  };
  pricing: { baseEur: number; domainEur: number; mcoRate: number; projectedTotalEur: number };
}

interface Analytics {
  days: { date: string; pageViews: number; uniques: number }[];
  totals: {
    pageViews: number;
    uniques: number;
    topPaths: Record<string, number>;
    topArtworks: Record<string, number>;
  };
}

function SiteDetailView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SiteDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [password, setPassword] = useState('');
  const [regenBusy, setRegenBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<SiteDetail>(`/me/sites/${id}`)
      .then(setData)
      .catch(() => setError('Site introuvable'));
  }, [id]);

  useEffect(() => {
    load();
    api<Analytics>(`/me/sites/${id}/analytics?range=30d`)
      .then(setAnalytics)
      .catch(() => {});
    api<Billing>(`/me/sites/${id}/billing`)
      .then(setBilling)
      .catch(() => {});
  }, [id, load]);

  // Recharge le détail quand le site passe live (poll léger pendant provisioning).
  useEffect(() => {
    if (data?.site.status !== 'provisioning') return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [data?.site.status, load]);

  const regenerate = async () => {
    setRegenBusy(true);
    setError('');
    try {
      const res = await api<{ password: string }>(`/me/sites/${id}/regenerate-password`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setPassword(res.password);
    } catch (err) {
      setError((err as Error).message);
    }
    setRegenBusy(false);
  };

  if (error && !data) {
    return (
      <div className="container section">
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container section">
        <p className="cartel">Chargement…</p>
      </div>
    );
  }

  const { site } = data;
  const maxViews = Math.max(1, ...(analytics?.days.map((d) => d.pageViews) ?? [1]));

  return (
    <section className="section">
      <div className="container">
        <p className="cartel" style={{ marginBottom: '0.6rem' }}>
          <Link href="/dashboard">Mes sites</Link> / {site.slug}
        </p>
        <div className="section-head">
          <h2>{site.artistName}</h2>
          <span className={styles.status} data-status={site.status}>
            {site.status === 'live'
              ? 'En ligne'
              : site.status === 'provisioning'
                ? 'Déploiement…'
                : site.status}
          </span>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.panel}>
            <p className={styles.panelTitle}>
              {site.status === 'provisioning' ? 'Déploiement en cours' : 'Dernier déploiement'}
            </p>
            <DeploymentTimeline siteId={site.id} />
            {site.status === 'live' && site.urls?.front && (
              <a
                href={site.urls.front}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Visiter mon site →
              </a>
            )}
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div className={styles.panel}>
              <p className={styles.panelTitle}>Back-office de votre site</p>
              <div className={styles.credRow}>
                <span className={styles.mono}>{site.adminEmail ?? '—'}</span>
                {site.urls?.backOffice && (
                  <a
                    href={site.urls.backOffice}
                    target="_blank"
                    rel="noreferrer"
                    className={`btn ${styles.btnSmall}`}
                  >
                    Ouvrir le back-office
                  </a>
                )}
              </div>
              {password ? (
                <>
                  <p className={styles.password}>{password}</p>
                  <p className="cartel">Notez ce mot de passe : il ne sera plus jamais affiché.</p>
                </>
              ) : (
                <button
                  className={`btn ${styles.btnSmall}`}
                  onClick={regenerate}
                  disabled={regenBusy || site.status !== 'live'}
                >
                  {regenBusy ? 'Génération…' : 'Régénérer le mot de passe'}
                </button>
              )}
              {error && <p className="error-text">{error}</p>}
            </div>

            <div className={styles.panel}>
              <p className={styles.panelTitle}>Audience — 30 jours</p>
              {analytics && analytics.totals.pageViews > 0 ? (
                <>
                  <div className={styles.statRow}>
                    <p>
                      <strong>{analytics.totals.pageViews}</strong>
                      <span className="cartel">Pages vues</span>
                    </p>
                    <p>
                      <strong>{analytics.totals.uniques}</strong>
                      <span className="cartel">Visiteurs</span>
                    </p>
                  </div>
                  <div
                    className={styles.bars}
                    role="img"
                    aria-label="Pages vues par jour sur 30 jours"
                  >
                    {analytics.days.map((day) => (
                      <span
                        key={day.date}
                        style={{ height: `${(day.pageViews / maxViews) * 100}%` }}
                        title={`${day.date} : ${day.pageViews} pages vues`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="cartel">
                  Pas encore de visites mesurées — partagez l’adresse de votre site !
                </p>
              )}
            </div>

            {billing && (
              <div className={styles.panel}>
                <p className={styles.panelTitle}>Consommation du mois</p>
                <div className={styles.summaryRow}>
                  <span className="cartel">Calcul (Cloud Run)</span>
                  <span>{billing.current.computeEur.toFixed(2)} €</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className="cartel">Requêtes</span>
                  <span>{billing.current.requestsEur.toFixed(2)} €</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className="cartel">Stockage</span>
                  <span>{billing.current.storageEur.toFixed(2)} €</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className="cartel">Trafic sortant</span>
                  <span>{billing.current.egressEur.toFixed(2)} €</span>
                </div>
                <div
                  className={styles.summaryRow}
                  style={{ borderTop: '1px solid var(--line)', paddingTop: '0.6rem' }}
                >
                  <span className="cartel">
                    <strong>Infrastructure ce mois-ci</strong>
                  </span>
                  <strong>{billing.current.totalEur.toFixed(2)} €</strong>
                </div>
                <p className={styles.meta}>
                  Facture projetée : ({billing.pricing.baseEur} € +{' '}
                  {billing.current.totalEur.toFixed(2)} € + {billing.pricing.domainEur} €) × 1,10 ={' '}
                  <strong>{billing.pricing.projectedTotalEur.toFixed(2)} €</strong>
                  {billing.current.method === 'estimation-locale' && ' (estimation locale)'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SiteDetailPage() {
  return (
    <RequireAuth>
      <SiteDetailView />
    </RequireAuth>
  );
}
