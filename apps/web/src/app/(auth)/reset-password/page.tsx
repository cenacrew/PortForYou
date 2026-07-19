'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthActions } from '@/lib/auth';
import styles from '../auth.module.css';

function ResetForm() {
  const t = useTranslations('ResetPassword');
  const router = useRouter();
  const params = useSearchParams();
  const { resetPassword } = useAuthActions();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState(token ? '' : t('invalidLink'));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await resetPassword(token, password);
      router.push('/login?reset=ok');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>{t('title')}</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !token}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy ? t('submitBusy') : t('submit')}
          </button>
        </form>
        <p className={styles.switch}>
          <Link href="/login">{t('backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
