import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Contact');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/contact' },
    openGraph: {
      type: 'website',
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: '/contact',
    },
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
