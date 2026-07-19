import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Tunnel de commande : pages transactionnelles, jamais indexées.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Order');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
