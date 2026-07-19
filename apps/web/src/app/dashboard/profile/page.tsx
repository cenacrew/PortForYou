'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth, useAuthActions } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from '../dashboard.module.css';

function ProfileView() {
  const t = useTranslations('DashboardProfile');
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await api('/me/account/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portforyou-mes-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

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
          <Link href="/dashboard">{t('breadcrumbDashboard')}</Link> / {t('breadcrumbCurrent')}
        </p>
        <div className="section-head">
          <h2>{t('title')}</h2>
        </div>

        <div className={styles.panel} style={{ marginBottom: '2rem' }}>
          <p className={styles.panelTitle}>{t('accountInfoTitle')}</p>
          <div className={styles.summaryRow}>
            <span className="cartel">{t('nameLabel')}</span>
            <span>{user?.displayName ?? '—'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className="cartel">{t('emailLabel')}</span>
            <span className={styles.mono}>{user?.email}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className="cartel">{t('billingLabel')}</span>
            <span>{t('billingManaged')}</span>
          </div>
        </div>

        <div className={styles.panel} style={{ marginBottom: '2rem' }}>
          <p className={styles.panelTitle}>{t('exportTitle')}</p>
          <p style={{ fontSize: '0.95rem' }}>{t('exportDescription')}</p>
          <button className={`btn ${styles.btnSmall}`} disabled={exporting} onClick={exportData}>
            {exporting ? t('exportBusy') : t('exportCta')}
          </button>
        </div>

        <div className={styles.panel} style={{ borderColor: '#b3261e55' }}>
          <p className={styles.panelTitle} style={{ color: '#b3261e' }}>
            {t('deleteTitle')}
          </p>
          <p style={{ fontSize: '0.95rem' }}>{t('deleteDescription')}</p>
          <div className="field">
            <label htmlFor="confirm">{t('confirmLabel', { word: t('deleteWord') })}</label>
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
            disabled={busy || confirmText !== t('deleteWord')}
            onClick={deleteAccount}
          >
            {busy ? t('deleteBusy') : t('deleteCta')}
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
