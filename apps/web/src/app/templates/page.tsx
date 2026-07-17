import type { Metadata } from 'next';
import Link from 'next/link';
import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';

export const metadata: Metadata = {
  title: 'Templates',
  description:
    'Parcourez la collection de templates de portfolio Port’ForYou — galerie, biographie, ' +
    'presse, back-office. Trouvez celle qui ressemble à votre travail.',
  alternates: { canonical: '/templates' },
  openGraph: {
    type: 'website',
    title: "Templates — Port'ForYou",
    description: 'La collection de templates de portfolio pour artistes visuels.',
    url: '/templates',
  },
};

export default function TemplatesPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>La collection</h2>
          <p className="cartel">{TEMPLATES.length} templates — toutes fonctionnalités incluses</p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>

        <div
          style={{
            marginTop: '4rem',
            textAlign: 'center',
            display: 'grid',
            gap: '1rem',
            justifyItems: 'center',
          }}
        >
          <p className="display" style={{ fontSize: '1.6rem' }}>
            Vous ne trouvez pas votre bonheur ?
          </p>
          <p className="cartel">
            On conçoit votre site sur mesure — devis personnalisé, sans engagement.
          </p>
          <Link href="/contact" className="btn btn-primary">
            Demander un devis →
          </Link>
        </div>
      </div>
    </section>
  );
}
