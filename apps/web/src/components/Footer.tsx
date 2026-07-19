import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Footer.module.css';

export function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <p className={styles.brand}>Port’ForYou</p>
          <p className="cartel">{t('tagline', { year: new Date().getFullYear() })}</p>
        </div>
        <nav className={styles.links} aria-label={t('nav')}>
          <Link href="/templates">{t('templates')}</Link>
          <Link href="/contact">{t('quote')}</Link>
          <Link href="/mentions-legales">{t('legal')}</Link>
          <Link href="/cgv">{t('terms')}</Link>
          <Link href="/confidentialite">{t('privacy')}</Link>
        </nav>
      </div>
    </footer>
  );
}
