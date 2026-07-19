import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Cgv');
  return { title: t('metaTitle') };
}

export default function CGV() {
  const t = useTranslations('Cgv');
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          {t('title')}
        </h1>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <p>{t.rich('object', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <p>{t.rich('price', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <p>{t.rich('termination', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <p>{t.rich('content', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
          <p>{t.rich('availability', { strong: (chunks) => <strong>{chunks}</strong> })}</p>
        </div>
      </div>
    </section>
  );
}
