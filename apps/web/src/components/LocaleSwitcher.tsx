'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { setLocale } from '@/i18n/actions';
import { LOCALES, type Locale } from '@/i18n/locale';
import styles from './LocaleSwitcher.module.css';

export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className={styles.switcher} aria-label={t('label')}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={styles.option}
          data-active={code === locale || undefined}
          disabled={pending}
          onClick={() => onChange(code)}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}
