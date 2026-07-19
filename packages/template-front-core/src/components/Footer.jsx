import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 2.5,
        px: { xs: 4, md: 8 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="caption" color="text.disabled">
        {t('footer.rights', { year: new Date().getFullYear(), name: 'Prénom Nom' })}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {t('footer.reproduction')}
      </Typography>
    </Box>
  );
}
