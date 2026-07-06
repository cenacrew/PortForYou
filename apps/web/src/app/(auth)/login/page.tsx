'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthActions } from '@/lib/auth';
import { GoogleIcon } from '@/components/GoogleIcon';
import styles from '../auth.module.css';

const OAUTH_ERRORS: Record<string, string> = {
  google_failed: 'La connexion Google a échoué, réessayez.',
  google_disabled: 'La connexion Google n’est pas activée sur ce serveur.',
  use_password:
    'Cet email est déjà associé à un compte avec mot de passe. Connectez-vous avec vos identifiants ci-dessus.',
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, loginWithGoogle } = useAuthActions();
  const next = params.get('next') || '/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(OAUTH_ERRORS[params.get('error') ?? ''] ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1>Bon retour.</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
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
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className={styles.switch}>
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        </p>
        <div className={styles.divider}>ou</div>
        <button type="button" onClick={loginWithGoogle} className={`btn ${styles.google}`}>
          <GoogleIcon />
          Continuer avec Google
        </button>
        <p className={styles.switch}>
          Pas encore de compte ?{' '}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
