'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthActions } from '@/lib/auth';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPassword');
  const { forgotPassword } = useAuthActions();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await forgotPassword(email).catch(() => {});
    setSent(true); // même réponse dans tous les cas : pas d'énumération
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>{t('title')}</h1>
        {sent ? (
          <p>{t.rich('sentMessage', { email, strong: (chunks) => <strong>{chunks}</strong> })}</p>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">{t('emailLabel')}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {busy ? t('submitBusy') : t('submit')}
            </button>
          </form>
        )}
        <p className={styles.switch}>
          <Link href="/login">{t('backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
