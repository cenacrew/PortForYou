import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button } from '@mui/material';
import { LOCALE_STORAGE_KEY } from '../i18n';

const LOCALES = ['fr', 'en'];

export default function LocaleSwitcher() {
  const { t, i18n } = useTranslation();

  function onChange(locale) {
    i18n.changeLanguage(locale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  return (
    <Box aria-label={t('localeSwitcher.label')} sx={{ display: 'flex', gap: 0.5 }}>
      {LOCALES.map((locale) => (
        <Button
          key={locale}
          size="small"
          color="inherit"
          onClick={() => onChange(locale)}
          sx={{
            minWidth: 'auto',
            px: 0.75,
            opacity: i18n.resolvedLanguage === locale ? 1 : 0.5,
            fontWeight: i18n.resolvedLanguage === locale ? 700 : 400,
          }}
        >
          {t(`localeSwitcher.${locale}`)}
        </Button>
      ))}
    </Box>
  );
}
