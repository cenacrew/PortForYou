import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './locale';

/**
 * Pas de routing par URL (`/en/...`) : la langue est portée par un cookie
 * (`pfy-locale`), lu ici pour chaque requête serveur. Choix délibéré pour
 * rester simple — un seul site, pas de besoin SEO de servir des URLs
 * distinctes par langue pour l'instant.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
