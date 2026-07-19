'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { API_URL } from '@/lib/api';
import styles from './contact.module.css';

export default function ContactPage() {
  const t = useTranslations('Contact');
  const PROJECT_TYPES = t.raw('projectTypes') as string[];
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectType: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t('sendError'));
      }
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={`container ${styles.card}`}>
        {status === 'sent' ? (
          <div className={styles.success}>
            <span className={styles.badge} aria-hidden>
              ✉️
            </span>
            <h1>{t('successTitle')}</h1>
            <p className="cartel">{t('successMessage', { name: form.name.split(' ')[0] })}</p>
            <Link href="/templates" className="btn">
              {t('viewTemplates')}
            </Link>
          </div>
        ) : (
          <>
            <h1>{t('title')}</h1>
            <p className={styles.intro}>
              {t.rich('intro', { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <form onSubmit={submit}>
              <div className={styles.row}>
                <div className="field">
                  <label htmlFor="name">{t('nameLabel')}</label>
                  <input
                    id="name"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={set('name')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">{t('emailLabel')}</label>
                  <input
                    id="email"
                    type="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={set('email')}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className="field">
                  <label htmlFor="projectType">{t('projectTypeLabel')}</label>
                  <select id="projectType" value={form.projectType} onChange={set('projectType')}>
                    <option value="">{t('selectPlaceholder')}</option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="budget">{t('budgetLabel')}</label>
                  <input
                    id="budget"
                    maxLength={60}
                    placeholder={t('budgetPlaceholder')}
                    value={form.budget}
                    onChange={set('budget')}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="message">{t('messageLabel')}</label>
                <textarea
                  id="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={form.message}
                  onChange={set('message')}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === 'sending'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {status === 'sending' ? t('submitBusy') : t('submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
