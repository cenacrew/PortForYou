import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Une question sur Port’ForYou, un projet de portfolio ou de site ? Écrivez-nous, nous ' +
    'revenons vers vous rapidement.',
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    title: "Contact — Port'ForYou",
    description: 'Contactez l’équipe Port’ForYou.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
