'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth, useAuthActions } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from '../dashboard.module.css';

function ProfileView() {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/me/account', { method: 'DELETE' });
      await logout();
      // Navigation pleine page : évite la course avec le garde RequireAuth
      // qui renverrait vers /login à l'instant où l'auth disparaît.
      window.location.assign('/?compte-supprime=1');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <p className="cartel" style={{ marginBottom: '0.6rem' }}>
          <Link href="/dashboard">Mes sites</Link> / Profil
        </p>
        <div className="section-head">
          <h2>Mon profil</h2>
        </div>

        <div className={styles.panel} style={{ marginBottom: '2rem' }}>
          <p className={styles.panelTitle}>Informations du compte</p>
          <div className={styles.summaryRow}>
            <span className="cartel">Nom</span>
            <span>{user?.displayName ?? '—'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className="cartel">Email</span>
            <span className={styles.mono}>{user?.email}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className="cartel">Facturation</span>
            <span>Gérée depuis « Facturation » sur la page Mes sites</span>
          </div>
        </div>

        <div className={styles.panel} style={{ borderColor: '#b3261e55' }}>
          <p className={styles.panelTitle} style={{ color: '#b3261e' }}>
            Supprimer mon compte
          </p>
          <p style={{ fontSize: '0.95rem' }}>
            Votre compte est supprimé immédiatement et vos sites sont suspendus, puis définitivement
            effacés sous 30 jours. Cette action est irréversible.
          </p>
          <div className="field">
            <label htmlFor="confirm">Tapez « SUPPRIMER » pour confirmer</label>
            <input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            className={`btn ${styles.btnSmall}`}
            style={{ borderColor: '#b3261e', color: '#b3261e' }}
            disabled={busy || confirmText !== 'SUPPRIMER'}
            onClick={deleteAccount}
          >
            {busy ? 'Suppression…' : 'Supprimer définitivement mon compte'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileView />
    </RequireAuth>
  );
}
