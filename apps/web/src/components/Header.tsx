'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { LocaleSwitcher } from './LocaleSwitcher';
import styles from './Header.module.css';

export function Header() {
  const t = useTranslations('Header');
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  const NAV = [
    { href: '/templates', label: t('navTemplates') },
    { href: '/#artistes', label: t('navArtists') },
    { href: '/#tarif', label: t('navPricing') },
    { href: '/contact', label: t('navQuote') },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          Port’For<span>You</span>
        </Link>
        <nav className={styles.nav} aria-label={t('navMain')}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={pathname === item.href || undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          {loading ? null : user ? (
            <>
              {isAdmin && <Link href="/admin">{t('navAdmin')}</Link>}
              <Link href="/dashboard" className="btn">
                {t('navDashboard')}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">{t('navLogin')}</Link>
              <Link href="/order" className="btn btn-primary">
                {t('navCreate')}
              </Link>
            </>
          )}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
