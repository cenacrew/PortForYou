'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
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
        <p className="cartel">Port’ForYou — plateforme de portfolios, est. 2026</p>
        <h1 className={`display ${styles.title}`}>
          Votre art mérite
          <br />
          mieux qu’un template.
        </h1>
        <p className={styles.sub}>
          Un portfolio professionnel, pensé pour les artistes visuels : galerie par technique,
          back-office complet, en ligne en quelques minutes.
        </p>
        <div className={styles.ctas}>
          <Link href="/templates" className="btn btn-primary">
            Découvrir les templates
          </Link>
          <Link href="/#comment" className="btn">
            Comment ça marche
          </Link>
        </div>
      </div>
      <p className={`cartel ${styles.scrollHint}`} aria-hidden>
        Défiler ↓
      </p>
    </section>
  );
}
