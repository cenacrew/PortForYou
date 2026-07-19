'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthActions } from '@/lib/auth';
import styles from '../auth.module.css';

function VerifyEmailForm() {
  const t = useTranslations('VerifyEmail');
  const params = useSearchParams();
  const { verifyEmail } = useAuthActions();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error');
  const [error, setError] = useState(token ? '' : t('invalidLink'));

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
        <h1>{t('title')}</h1>
        {status === 'pending' && <p>{t('pending')}</p>}
        {status === 'ok' && <p>{t('success')}</p>}
        {status === 'error' && <p className="error-text">{error}</p>}
        <p className={styles.switch}>
          <Link href="/dashboard">{t('goDashboard')}</Link>
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
