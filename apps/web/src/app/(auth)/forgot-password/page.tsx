'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthActions } from '@/lib/auth';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
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
        <h1>Mot de passe oublié</h1>
        {sent ? (
          <p>
            Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de
            lui être envoyé (valable 1 heure).
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email du compte</label>
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
              {busy ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        <p className={styles.switch}>
          <Link href="/login">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
