'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from './locale';

/** Change la langue de préférence (cookie 1 an) — appelé par LocaleSwitcher. */
export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}
