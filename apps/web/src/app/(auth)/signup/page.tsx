'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthActions } from '@/lib/auth';
import { GoogleIcon } from '@/components/GoogleIcon';
import styles from '../auth.module.css';

function SignupForm() {
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
        <h1>Bienvenue parmi les artistes.</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name">Nom</label>
            <input
              id="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
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
            <label htmlFor="password">Mot de passe (8 caractères minimum)</label>
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
            {busy ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        <div className={styles.divider}>ou</div>
        <button type="button" onClick={loginWithGoogle} className={`btn ${styles.google}`}>
          <GoogleIcon />
          Continuer avec Google
        </button>
        <p className={styles.switch}>
          Déjà un compte ?{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Se connecter</Link>
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
