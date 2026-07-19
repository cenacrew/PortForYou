'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { TEMPLATES } from '@/lib/templates';
import styles from './order.module.css';

type SlugState = { checking: boolean; available: boolean | null; reason?: string };

function OrderFunnel() {
  const t = useTranslations('Order');
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(0);
  const [templateSlug, setTemplateSlug] = useState(params.get('template') || 'atelier');
  const [siteSlug, setSiteSlug] = useState('');
  const [slugState, setSlugState] = useState<SlugState>({ checking: false, available: null });
  const [artistName, setArtistName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Connexion requise pour commander.
  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/order');
    if (user && !contactEmail) setContactEmail(user.email ?? '');
    if (user && !artistName) setArtistName(user.displayName ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // Vérification de disponibilité du slug (debounce 400 ms).
  useEffect(() => {
    if (!siteSlug) {
      setSlugState({ checking: false, available: null });
      return;
    }
    setSlugState({ checking: true, available: null });
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean; reason?: string }>(
          `/slugs/check?slug=${encodeURIComponent(siteSlug)}`,
        );
        setSlugState({ checking: false, available: res.available, reason: res.reason });
      } catch {
        setSlugState({ checking: false, available: null, reason: t('checkFailed') });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [siteSlug, t]);

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ checkoutUrl: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({ templateSlug, siteSlug, artistName, contactEmail }),
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (loading || !user) return null;

  const template = TEMPLATES.find((t) => t.slug === templateSlug);
  const canNext =
    step === 0
      ? Boolean(template?.available)
      : step === 1
        ? slugState.available === true
        : step === 2
          ? artistName.trim().length > 0 && /\S+@\S+\.\S+/.test(contactEmail)
          : true;

  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.stepper} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} data-done={i <= step || undefined} />
        ))}
      </div>

      {step === 0 && (
        <>
          <h1 className={styles.title}>{t('step0Title')}</h1>
          <div className={styles.templateChoices}>
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.slug}
                type="button"
                className={styles.templateChoice}
                data-selected={tpl.slug === templateSlug || undefined}
                disabled={!tpl.available}
                onClick={() => setTemplateSlug(tpl.slug)}
              >
                <span>
                  <strong>{tpl.name}</strong>
                  <br />
                  <span className="cartel">{tpl.tagline}</span>
                </span>
                {!tpl.available && <span className="cartel">{t('comingSoon')}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1 className={styles.title}>{t('step1Title')}</h1>
          <div className="field">
            <label htmlFor="slug">{t('slugLabel')}</label>
            <input
              id="slug"
              value={siteSlug}
              placeholder={t('slugPlaceholder')}
              autoComplete="off"
              onChange={(e) => setSiteSlug(e.target.value.toLowerCase().trim())}
            />
          </div>
          <p className={styles.slugPreview}>
            {t.rich('slugPreview', {
              slug: siteSlug || t('slugPlaceholderName'),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          {slugState.checking && <p className="cartel">{t('checking')}</p>}
          {slugState.available === true && <p className="ok-text">{t('slugAvailable')}</p>}
          {slugState.available === false && (
            <p className="error-text">{slugState.reason ?? t('slugTaken')}</p>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <h1 className={styles.title}>{t('step2Title')}</h1>
          <div className="field">
            <label htmlFor="artist">{t('artistLabel')}</label>
            <input id="artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="contact">{t('contactLabel')}</label>
            <input
              id="contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className={styles.title}>{t('step3Title')}</h1>
          <dl className={styles.summary}>
            <div className={styles.summaryRow}>
              <dt>{t('summaryTemplate')}</dt>
              <dd>{template?.name}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>{t('summaryAddress')}</dt>
              <dd>pfy-{siteSlug}.web.app</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>{t('summaryArtist')}</dt>
              <dd>{artistName}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>{t('summarySubscription')}</dt>
              <dd>{t('subscriptionDetail')}</dd>
            </div>
          </dl>
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={busy}
            onClick={pay}
          >
            {busy ? t('payBusy') : t('pay')}
          </button>
        </>
      )}

      <div className={styles.nav}>
        {step > 0 ? (
          <button className="btn" onClick={() => setStep(step - 1)}>
            {t('back')}
          </button>
        ) : (
          <span />
        )}
        {step < 3 && (
          <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {t('continue')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderFunnel />
    </Suspense>
  );
}
