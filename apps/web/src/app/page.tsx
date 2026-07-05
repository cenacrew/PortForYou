import Link from 'next/link';
import { Hero } from '@/components/hero/Hero';
import { Reveal } from '@/components/Reveal';
import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';
import styles from './page.module.css';

const STEPS = [
  {
    title: 'Choisissez',
    text: 'Parcourez les templates, visitez leurs démos, trouvez celle qui ressemble à votre travail.',
  },
  {
    title: 'Nommez',
    text: 'Réservez le nom de votre site en un clic — il devient votre adresse en ligne.',
  },
  {
    title: 'C’est en ligne',
    text: 'Payez, suivez le déploiement en direct, recevez vos accès : votre portfolio est vivant.',
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section id="comment" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Comment ça marche</h2>
            <p className="cartel">De la toile à l’écran</p>
          </div>
          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.12}>
                <article className={styles.step}>
                  <h3 className="display">{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="artistes" className={`section ${styles.trusted}`}>
        <div className="container">
          <div className="section-head">
            <h2>Ils nous ont fait confiance</h2>
            <p className="cartel">Le premier d’une longue série</p>
          </div>
          <Reveal>
            <blockquote className={styles.testimonial}>
              <p className={`display ${styles.quote}`}>
                « Je gère mes œuvres, mes expositions et ma presse moi-même — sans jamais toucher au
                code. »
              </p>
              <footer>
                <p>
                  <strong>Marcel Nino Pajot</strong>
                </p>
                <p className="cartel">
                  Artiste peintre — techniques mixtes, aquarelle, illustration
                </p>
                <a
                  className={styles.testimonialLink}
                  href="https://marcel-nino-pajot.web.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir son portfolio →
                </a>
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Les templates</h2>
            <Link href="/templates" className="cartel">
              Toute la collection →
            </Link>
          </div>
          <div className={styles.templates}>
            {TEMPLATES.map((template, i) => (
              <Reveal key={template.slug} delay={i * 0.1}>
                <TemplateCard template={template} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="tarif" className={`section ${styles.pricing}`}>
        <div className="container">
          <Reveal>
            <div className={styles.priceCard}>
              <p className="cartel">Tarification à l’usage — sans engagement</p>
              <p className={`display ${styles.price}`}>
                5 €<span>/mois + consommation</span>
              </p>
              <ul className={styles.priceList}>
                <li>5 € d’abonnement + 1 € de domaine par mois</li>
                <li>
                  + votre consommation d’infrastructure réelle — vous payez ce que votre site
                  consomme, rien de plus
                </li>
                <li>+ 10 % pour la maintenance et le support</li>
                <li>Exemple : 4,50 € d’infra ce mois-ci → (5 + 4,50 + 1) × 1,10 = 11,55 €</li>
                <li>Détail de consommation visible en continu dans votre espace</li>
              </ul>
              <Link href="/order" className="btn btn-primary">
                Créer mon portfolio
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
