import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <p className={styles.brand}>Port’ForYou</p>
          <p className="cartel">Portfolios pour artistes visuels — {new Date().getFullYear()}</p>
        </div>
        <nav className={styles.links} aria-label="Pied de page">
          <Link href="/templates">Templates</Link>
          <Link href="/contact">Devis sur mesure</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgv">CGV</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </div>
    </footer>
  );
}
