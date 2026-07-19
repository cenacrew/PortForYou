import React from 'react';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSiteConfig } from '../contexts/SiteConfigContext';

export default function Biographie() {
  const { t } = useTranslation();
  const config = useSiteConfig();

  const imageUrl = config?.biographyImageUrl || '/placeholder-portrait.svg';
  const text = config?.biographyText || t('biography.defaultText');

  if (!config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        {t('biography.heading')}
      </Typography>

      <Box>
        <Box
          component="img"
          src={imageUrl}
          alt={t('biography.portraitAlt')}
          sx={{
            float: 'left',
            width: { xs: 140, sm: 200, md: 260 },
            height: 'auto',
            borderRadius: 0.4,
            boxShadow: 3,
            mr: 4,
            mb: 2,
            mt: '0.4em',
            shapeOutside: 'margin-box',
          }}
        />
        <Typography
          component="div"
          variant="body1"
          sx={{ lineHeight: 1.8, textAlign: 'left', whiteSpace: 'pre-wrap' }}
        >
          {text}
        </Typography>
      </Box>
    </Container>
  );
}
