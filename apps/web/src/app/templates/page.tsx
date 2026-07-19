import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { TemplateCard } from '@/components/TemplateCard';
import { TEMPLATES } from '@/lib/templates';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Templates');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/templates' },
    openGraph: {
      type: 'website',
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: '/templates',
    },
  };
}

export default function TemplatesPage() {
  const t = useTranslations('Templates');
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>{t('title')}</h2>
          <p className="cartel">{t('subtitle', { count: TEMPLATES.length })}</p>
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
            {t('notFoundTitle')}
          </p>
          <p className="cartel">{t('notFoundSubtitle')}</p>
          <Link href="/contact" className="btn btn-primary">
            {t('requestQuote')}
          </Link>
        </div>
      </div>
    </section>
  );
}
