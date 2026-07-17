import type { Metadata } from 'next';

// Tunnel de commande : pages transactionnelles, jamais indexées.
export const metadata: Metadata = {
  title: 'Commander votre site',
  robots: { index: false, follow: false },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
