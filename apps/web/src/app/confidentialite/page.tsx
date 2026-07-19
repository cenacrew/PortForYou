import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Privacy');
  return { title: t('metaTitle') };
}

export default function Confidentialite() {
  const t = useTranslations('Privacy');
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const em = (chunks: React.ReactNode) => <em>{chunks}</em>;
  const br = () => <br />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          {t('title')}
        </h1>
        <div style={{ display: 'grid', gap: '1.6rem' }}>
          <p>{t('intro')}</p>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('controllerTitle')}</h2>
            <p>{t.rich('controllerText', { br })}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('dataTitle')}</h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>{t.rich('dataAccount', { strong })}</li>
              <li>{t.rich('dataOrders', { strong })}</li>
              <li>{t.rich('dataPayment', { strong })}</li>
              <li>{t.rich('dataPortfolio', { strong })}</li>
              <li>{t.rich('dataAnalytics', { strong })}</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('purposesTitle')}</h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>{t.rich('purposeService', { em })}</li>
              <li>{t.rich('purposeBilling', { em })}</li>
              <li>{t.rich('purposeEmails', { em })}</li>
              <li>{t.rich('purposeSecurity', { em })}</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('processorsTitle')}</h2>
            <p>{t('processorsIntro')}</p>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>{t.rich('processorGcp', { strong })}</li>
              <li>{t.rich('processorStripe', { strong })}</li>
              <li>{t.rich('processorResend', { strong })}</li>
            </ul>
            <p>{t('processorsTransfer')}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('retentionTitle')}</h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>{t('retentionAccount')}</li>
              <li>{t('retentionDeleted')}</li>
              <li>{t('retentionBilling')}</li>
              <li>{t('retentionLogs')}</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('cookiesTitle')}</h2>
            <p>{t('cookiesText')}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{t('rightsTitle')}</h2>
            <p>{t('rightsIntro')}</p>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>{t.rich('rightPortability', { strong })}</li>
              <li>{t.rich('rightErasure', { strong })}</li>
              <li>{t('rightOther')}</li>
            </ul>
            <p>
              {t.rich('rightsCnil', {
                a: (chunks) => (
                  <a href="https://www.cnil.fr" style={{ textDecoration: 'underline' }}>
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
