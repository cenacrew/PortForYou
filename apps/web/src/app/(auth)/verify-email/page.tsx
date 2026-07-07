'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthActions } from '@/lib/auth';
import styles from '../auth.module.css';

function VerifyEmailForm() {
  const params = useSearchParams();
  const { verifyEmail } = useAuthActions();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error');
  const [error, setError] = useState(token ? '' : 'Lien invalide.');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setError((err as Error).message);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Confirmation d’email</h1>
        {status === 'pending' && <p>Vérification en cours…</p>}
        {status === 'ok' && <p>Votre adresse email est confirmée. Merci !</p>}
        {status === 'error' && <p className="error-text">{error}</p>}
        <p className={styles.switch}>
          <Link href="/dashboard">→ Aller à mon dashboard</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
