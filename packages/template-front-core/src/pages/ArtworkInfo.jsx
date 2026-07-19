import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Stack, Box, Divider, Chip, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { techniques, apiUrl } from '../utils';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { applyHead, buildArtworkSeo } from '../seo';

export default function ArtworkInfo() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const passedItem = location.state?.item || null;

  const cachedItem = useMemo(() => {
    if (passedItem) return passedItem;
    try {
      const raw = sessionStorage.getItem('artworks_cache');
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.find((it) => String(it.id) === String(id)) || null : null;
    } catch {
      return null;
    }
  }, [passedItem, id]);

  const [item, setItem] = useState(cachedItem);
  const [loading, setLoading] = useState(!cachedItem);
  const [activeIndex, setActiveIndex] = useState(0);
  const config = useSiteConfig();

  useEffect(() => {
    if (item) applyHead(buildArtworkSeo(item, config || {}));
  }, [item, config]);

  useEffect(() => {
    if (cachedItem) return;
    fetch(apiUrl(`/artworks/detail/${id}`), { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) navigate('/galerie', { replace: true });
        else setItem(data);
      })
      .catch(() => navigate('/galerie', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, cachedItem, navigate]);

  useEffect(() => {
    setActiveIndex(0);
  }, [item]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!item) return null;

  const allImages = [...(item.imageUrl ? [item.imageUrl] : []), ...(item.additionalImages || [])];

  const techniqueLabel = techniques.find((tech) => tech.value === item.technique)
    ? t(`techniques.${item.technique}`)
    : item.technique;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: { xs: 4, md: 6 },
          alignItems: 'start',
        }}
      >
        {/* ── Galerie d'images ── */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          {/* Thumbnails verticaux */}
          {allImages.length > 1 && (
            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              {allImages.map((src, i) => (
                <Box
                  key={i}
                  component="img"
                  src={src}
                  alt=""
                  onClick={() => setActiveIndex(i)}
                  sx={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: i === activeIndex ? 'primary.main' : 'transparent',
                    opacity: i === activeIndex ? 1 : 0.6,
                    transition: 'opacity 0.15s, border-color 0.15s',
                    '&:hover': { opacity: 1 },
                  }}
                />
              ))}
            </Stack>
          )}

          {/* Image principale */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {allImages.length > 0 ? (
              <Box
                component="img"
                src={allImages[activeIndex]}
                alt={item.title || ''}
                sx={{
                  width: '100%',
                  maxHeight: '80vh',
                  borderRadius: 0.5,
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Box
                sx={{ width: '100%', aspectRatio: '1', bgcolor: 'action.hover', borderRadius: 0.5 }}
              />
            )}
          </Box>
        </Box>

        {/* ── Infos ── */}
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {item.title || t('artworkInfo.defaultTitle')}
          </Typography>

          <Stack spacing={1} sx={{ mb: 3 }}>
            {item.technique && (
              <Typography variant="body1">
                {t('artworkInfo.techniqueLabel')}
                <strong>{techniqueLabel}</strong>
              </Typography>
            )}
            {item.height != null && item.width != null && (
              <Typography variant="body1">
                {t('artworkInfo.dimensionsLabel')}
                <strong>
                  {t('artworkInfo.dimensionsValue', { height: item.height, width: item.width })}
                </strong>
              </Typography>
            )}
            {item.year != null && (
              <Typography variant="body1">
                {t('artworkInfo.yearLabel')}
                <strong>{item.year}</strong>
              </Typography>
            )}
          </Stack>

          {item.comment && (
            <>
              <Divider sx={{ my: 2 }}>
                <Chip label={t('artworkInfo.commentLabel')} size="small" />
              </Divider>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {item.comment}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Container>
  );
}
