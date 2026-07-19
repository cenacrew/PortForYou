import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Hero } from '@/components/hero/Hero';
import { Reveal } from '@/components/Reveal';
import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';
import styles from './page.module.css';

export default function Home() {
  const t = useTranslations('Home');
  const STEPS = [
    { title: t('step1Title'), text: t('step1Text') },
    { title: t('step2Title'), text: t('step2Text') },
    { title: t('step3Title'), text: t('step3Text') },
  ];

  return (
    <>
      <Hero />

      <section id="comment" className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t('stepsTitle')}</h2>
            <p className="cartel">{t('stepsSubtitle')}</p>
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
            <h2>{t('trustedTitle')}</h2>
            <p className="cartel">{t('trustedSubtitle')}</p>
          </div>
          <Reveal>
            <blockquote className={styles.testimonial}>
              <p className={`display ${styles.quote}`}>{t('testimonialQuote')}</p>
              <footer>
                <p>
                  <strong>{t('testimonialName')}</strong>
                </p>
                <p className="cartel">{t('testimonialRole')}</p>
                <a
                  className={styles.testimonialLink}
                  href="https://marcel-nino-pajot.web.app"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('testimonialLink')}
                </a>
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t('templatesTitle')}</h2>
            <Link href="/templates" className="cartel">
              {t('templatesLink')}
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
              <p className="cartel">{t('pricingTagline')}</p>
              <p className={`display ${styles.price}`}>
                5 €<span>{t('priceSuffix')}</span>
              </p>
              <ul className={styles.priceList}>
                <li>{t('priceItem1')}</li>
                <li>{t('priceItem2')}</li>
                <li>{t('priceItem3')}</li>
                <li>{t('priceItem4')}</li>
                <li>{t('priceItem5')}</li>
              </ul>
              <Link href="/order" className="btn btn-primary">
                {t('createCta')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
