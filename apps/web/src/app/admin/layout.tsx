import type { Metadata } from 'next';

// Console d'administration plateforme : jamais indexée.
export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
