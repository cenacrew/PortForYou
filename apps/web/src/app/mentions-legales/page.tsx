import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('LegalNotice');
  return { title: t('metaTitle') };
}

export default function MentionsLegales() {
  const t = useTranslations('LegalNotice');
  const br = () => <br />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          {t('title')}
        </h1>
        <div style={{ display: 'grid', gap: '1.6rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('publisherTitle')}</h2>
            <p>{t.rich('publisherText', { br })}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('contactTitle')}</h2>
            <p>{t('contactText')}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('hostingTitle')}</h2>
            <p>{t('hostingText')}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('ipTitle')}</h2>
            <p>{t('ipText')}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('dataTitle')}</h2>
            <p>
              {t.rich('dataText', {
                privacyLink: (chunks) => (
                  <a href="/confidentialite" style={{ textDecoration: 'underline' }}>
                    {chunks}
                  </a>
                ),
                cgvLink: (chunks) => (
                  <a href="/cgv" style={{ textDecoration: 'underline' }}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
