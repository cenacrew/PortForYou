import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { SITE_NAME } from '@/lib/site';

// Image Open Graph par défaut de la vitrine (1200×630), générée à la build.
// Convention Next : appliquée automatiquement à og:image et twitter:image de
// toutes les pages, sauf celles qui définissent leur propre image.
export const runtime = 'nodejs';
export const alt = "Port'ForYou — Portfolios pour artistes visuels";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const t = await getTranslations('OpengraphImage');
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #0e0e10 0%, #23232a 100%)',
        color: '#f7f4ec',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 34, letterSpacing: 8, opacity: 0.7, textTransform: 'uppercase' }}>
        {SITE_NAME}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 82,
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: 24,
        }}
      >
        <span>{t('titleLine1')}</span>
        <span>{t('titleLine2')}</span>
      </div>
      <div style={{ fontSize: 32, opacity: 0.8, marginTop: 36, maxWidth: 900 }}>
        {t('description')}
      </div>
    </div>,
    size,
  );
}
