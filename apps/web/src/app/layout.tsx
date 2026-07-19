import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { LenisProvider } from '@/components/LenisProvider';
import { AuthProvider } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz', 'SOFT', 'WONK'],
});
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Port'ForYou — Portfolios pour artistes visuels",
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'fr_FR',
    url: SITE_URL,
    title: "Port'ForYou — Portfolios pour artistes visuels",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: "Port'ForYou — Portfolios pour artistes visuels",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <LenisProvider>
              <Header />
              <main>{children}</main>
              <Footer />
            </LenisProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
