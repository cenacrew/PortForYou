'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './Header.module.css';

const NAV = [
  { href: '/templates', label: 'Templates' },
  { href: '/#artistes', label: 'Artistes' },
  { href: '/#tarif', label: 'Tarif' },
  { href: '/contact', label: 'Devis' },
];

export function Header() {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          Port’For<span>You</span>
        </Link>
        <nav className={styles.nav} aria-label="Navigation principale">
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
              {isAdmin && <Link href="/admin">Admin</Link>}
              <Link href="/dashboard" className="btn">
                Mon espace
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">Connexion</Link>
              <Link href="/order" className="btn btn-primary">
                Créer mon portfolio
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
