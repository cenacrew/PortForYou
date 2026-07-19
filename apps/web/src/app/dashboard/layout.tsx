import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Espace client authentifié : jamais indexé.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Dashboard');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
