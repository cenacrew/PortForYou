'use client';

import { useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';
import styles from '../dashboard/dashboard.module.css';

interface Overview {
  clients: number;
  sites: number;
  sitesByStatus: Record<string, number>;
  failedDeployments: number;
}

interface AdminSite {
  id: string;
  slug: string;
  artistName: string;
  status: string;
  clientEmail: string;
  urls?: { front?: string };
  health?: { status: string; latencyMs: number };
  createdAt: string | null;
}

interface AdminDeployment {
  id: string;
  siteId: string;
  trigger: string;
  status: string;
  steps: { id: string; status: string; error?: string }[];
  createdAt: string | null;
}

function AdminView() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [deployments, setDeployments] = useState<AdminDeployment[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api<Overview>('/admin/overview')
      .then(setOverview)
      .catch(() => {});
    api<{ items: AdminSite[] }>('/admin/sites')
      .then((r) => setSites(r.items))
      .catch(() => {});
    api<{ items: AdminDeployment[] }>('/admin/deployments')
      .then((r) => setDeployments(r.items.slice(0, 15)))
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const action = async (path: string, method: 'POST' | 'DELETE', confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage('');
    try {
      await api(path, { method, body: method === 'POST' ? JSON.stringify({}) : undefined });
      setMessage('Action effectuée.');
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Administration</h2>
          <p className="cartel">Supervision de la plateforme</p>
        </div>

        {overview && (
          <div className={styles.statRow} style={{ marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <p>
              <strong>{overview.clients}</strong>
              <span className="cartel">Clients</span>
            </p>
            <p>
              <strong>{overview.sites}</strong>
              <span className="cartel">Sites</span>
            </p>
            <p>
              <strong>{overview.sitesByStatus.live ?? 0}</strong>
              <span className="cartel">En ligne</span>
            </p>
            <p>
              <strong>{overview.failedDeployments}</strong>
              <span className="cartel">Déploiements échoués</span>
            </p>
          </div>
        )}

        {message && (
          <p className="cartel" style={{ marginBottom: '1rem' }}>
            {message}
          </p>
        )}

        <div className={styles.panel} style={{ marginBottom: '2rem', overflowX: 'auto' }}>
          <p className={styles.panelTitle}>Sites</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Site</th>
                <th>Client</th>
                <th>Statut</th>
                <th>Santé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id}>
                  <td>
                    <strong>{site.slug}</strong>
                    <br />
                    <span className="cartel">{site.artistName}</span>
                  </td>
                  <td className={styles.mono}>{site.clientEmail}</td>
                  <td>
                    <span className={styles.status} data-status={site.status}>
                      {site.status}
                    </span>
                  </td>
                  <td>
                    {site.health
                      ? `${site.health.status === 'up' ? '🟢' : '🔴'} ${site.health.latencyMs} ms`
                      : '—'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`btn ${styles.btnSmall}`}
                        onClick={() => action(`/admin/sites/${site.id}/redeploy`, 'POST')}
                      >
                        Redéployer
                      </button>
                      <button
                        className={`btn ${styles.btnSmall}`}
                        onClick={() =>
                          action(
                            `/admin/sites/${site.id}/suspend`,
                            'POST',
                            `Suspendre ${site.slug} ?`,
                          )
                        }
                      >
                        Suspendre
                      </button>
                      <button
                        className={`btn ${styles.btnSmall}`}
                        onClick={() =>
                          action(
                            `/admin/sites/${site.id}`,
                            'DELETE',
                            `Supprimer définitivement ${site.slug} (site, données, secrets) ?`,
                          )
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.panel} style={{ overflowX: 'auto' }}>
          <p className={styles.panelTitle}>Derniers déploiements</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>Déclencheur</th>
                <th>Statut</th>
                <th>Étapes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((deployment) => (
                <tr key={deployment.id}>
                  <td className={styles.mono}>
                    {deployment.createdAt
                      ? new Date(deployment.createdAt).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td className={styles.mono}>{deployment.siteId.slice(0, 8)}…</td>
                  <td>{deployment.trigger}</td>
                  <td>{deployment.status}</td>
                  <td className={styles.mono}>
                    {deployment.steps.map((step) =>
                      step.status === 'done' ? '●' : step.status === 'failed' ? '✕' : '○',
                    )}
                  </td>
                  <td>
                    {deployment.status === 'failed' && (
                      <button
                        className={`btn ${styles.btnSmall}`}
                        onClick={() => action(`/admin/deployments/${deployment.id}/retry`, 'POST')}
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth admin>
      <AdminView />
    </RequireAuth>
  );
}
