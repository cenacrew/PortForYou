'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Hero.module.css';

const VeilCanvas = lazy(() => import('./VeilCanvas'));

function useCanvasAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    const webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    setAllowed(!reduced && webgl);
  }, []);
  return allowed;
}

export function Hero() {
  const t = useTranslations('Hero');
  const canvasAllowed = useCanvasAllowed();

  return (
    <section className={styles.hero}>
      {canvasAllowed && (
        <Suspense fallback={null}>
          <VeilCanvas />
        </Suspense>
      )}
      <div className={styles.fallback} aria-hidden data-hidden={canvasAllowed || undefined} />
      <div className={`container ${styles.content}`}>
        <p className="cartel">{t('eyebrow')}</p>
        <h1 className={`display ${styles.title}`}>
          {t('titleLine1')}
          <br />
          {t('titleLine2')}
        </h1>
        <p className={styles.sub}>{t('subtitle')}</p>
        <div className={styles.ctas}>
          <Link href="/templates" className="btn btn-primary">
            {t('ctaTemplates')}
          </Link>
          <Link href="/#comment" className="btn">
            {t('ctaHow')}
          </Link>
        </div>
      </div>
      <p className={`cartel ${styles.scrollHint}`} aria-hidden>
        {t('scrollHint')}
      </p>
    </section>
  );
}
