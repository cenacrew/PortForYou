import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Console d'administration plateforme : jamais indexée.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
