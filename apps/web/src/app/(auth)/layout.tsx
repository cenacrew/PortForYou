import type { Metadata } from 'next';

// Pages d'authentification : jamais indexées.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
