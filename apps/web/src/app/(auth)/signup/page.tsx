'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthActions } from '@/lib/auth';
import { GoogleIcon } from '@/components/GoogleIcon';
import styles from '../auth.module.css';

function SignupForm() {
  const t = useTranslations('Signup');
  const router = useRouter();
  const params = useSearchParams();
  const { signup, loginWithGoogle } = useAuthActions();
  const next = params.get('next') || '/dashboard';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signup(form.name, form.email, form.password);
      router.push(next);
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
            <label htmlFor="name">{t('nameLabel')}</label>
            <input
              id="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy ? t('submitBusy') : t('submit')}
          </button>
        </form>
        <div className={styles.divider}>{t('or')}</div>
        <button type="button" onClick={loginWithGoogle} className={`btn ${styles.google}`}>
          <GoogleIcon />
          {t('googleCta')}
        </button>
        <p className={styles.switch}>
          {t('haveAccount')}{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
