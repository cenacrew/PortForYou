import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import styles from './page.module.css';

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export default async function TemplateDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  return (
    <section className="section">
      <div className="container">
        <p className="cartel" style={{ marginBottom: '1rem' }}>
          <Link href="/templates">Collection</Link> / {template.name}
        </p>
        <div className={styles.grid}>
          <div>
            <Image
              src={template.image}
              alt={`Aperçu de la template ${template.name}`}
              width={800}
              height={560}
              className={styles.image}
              priority
            />
          </div>
          <div className={styles.cartel}>
            <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
              {template.name}
            </h1>
            <p className="cartel">
              {template.medium}, {template.year}
            </p>
            <p className={styles.description}>{template.description}</p>
            <ul className={styles.features}>
              {template.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className={styles.ctas}>
              {template.available ? (
                <Link href={`/order?template=${template.slug}`} className="btn btn-primary">
                  Choisir cette template
                </Link>
              ) : (
                <span className="btn" aria-disabled>
                  Bientôt disponible
                </span>
              )}
              {template.demoUrl && (
                <a href={template.demoUrl} target="_blank" rel="noreferrer" className="btn">
                  Voir la démo
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
