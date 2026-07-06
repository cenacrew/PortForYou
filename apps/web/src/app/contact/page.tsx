'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import styles from './contact.module.css';

const PROJECT_TYPES = [
  'Portfolio artiste',
  'Site vitrine',
  'Boutique / e-commerce',
  'Refonte de site existant',
  'Autre',
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    projectType: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
        throw new Error(data.error ?? 'Envoi impossible, réessayez.');
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
            <h1>Demande envoyée.</h1>
            <p className="cartel">
              Merci {form.name.split(' ')[0]} — on revient vers vous très vite avec une proposition
              sur mesure.
            </p>
            <Link href="/templates" className="btn">
              Revoir les templates
            </Link>
          </div>
        ) : (
          <>
            <h1>Un projet sur mesure ?</h1>
            <p className={styles.intro}>
              Vous ne trouvez pas votre bonheur dans nos templates ? Décrivez votre projet et on
              vous prépare un <strong>devis personnalisé</strong>, sans engagement.
            </p>
            <form onSubmit={submit}>
              <div className={styles.row}>
                <div className="field">
                  <label htmlFor="name">Votre nom</label>
                  <input id="name" required maxLength={120} value={form.name} onChange={set('name')} />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
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
                  <label htmlFor="projectType">Type de projet</label>
                  <select id="projectType" value={form.projectType} onChange={set('projectType')}>
                    <option value="">— Sélectionnez —</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="budget">Budget indicatif (optionnel)</label>
                  <input
                    id="budget"
                    maxLength={60}
                    placeholder="ex. 500 – 1000 €"
                    value={form.budget}
                    onChange={set('budget')}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="message">Votre projet en quelques mots</label>
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
                {status === 'sending' ? 'Envoi…' : 'Demander un devis'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
