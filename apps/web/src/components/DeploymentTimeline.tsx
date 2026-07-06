'use client';

import { useEffect, useState } from 'react';
import { API_URL, getAccessToken } from '@/lib/api';
import styles from './DeploymentTimeline.module.css';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
}

interface Deployment {
  id: string;
  status: string;
  steps: Step[];
}

const ICONS = { pending: '○', running: '◐', done: '●', failed: '✕' } as const;

/**
 * Timeline temps réel du déploiement : flux SSE servi par notre API
 * (qui écoute Firestore côté serveur). EventSource ne pouvant pas poser
 * de header, l'access token passe en query — vérifié comme un Bearer.
 */
export function DeploymentTimeline({ siteId }: { siteId: string }) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const source = new EventSource(
      `${API_URL}/api/v1/me/sites/${siteId}/deployments/stream?token=${encodeURIComponent(token)}`,
    );
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { deployment: Deployment | null };
        setDeployment(data.deployment);
      } catch {
        /* trame ignorée */
      }
    };
    return () => source.close();
  }, [siteId]);

  if (!deployment) return <p className="cartel">Aucun déploiement pour ce site.</p>;

  return (
    <ol className={styles.timeline} aria-label="Progression du déploiement">
      {deployment.steps.map((step) => (
        <li key={step.id} className={styles.step} data-status={step.status}>
          <span className={styles.icon} aria-hidden>
            {ICONS[step.status]}
          </span>
          <div className={styles.stepBody}>
            <p>{step.label}</p>
            {step.error && <p className={`error-text ${styles.stepError}`}>{step.error}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
