import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useDesignSystem } from '../design-system/DesignSystemContext';
import { techniques, apiUrl } from '../utils';

const PAGE_SIZE = 24;

export default function Galerie() {
  const { t } = useTranslation();
  // ArtworkList porte la direction artistique du template — injecté par la DA.
  const { ArtworkList } = useDesignSystem();
  const [searchParams] = useSearchParams();
  const techniqueFilter = searchParams.get('technique');
  const techniqueLabel = techniqueFilter
    ? techniques.find((tech) => tech.value === techniqueFilter)
      ? t(`techniques.${techniqueFilter}`)
      : techniqueFilter
    : null;

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (startAfter, signal) => {
      const base = techniqueFilter ? apiUrl(`/artworks/${techniqueFilter}`) : apiUrl('/artworks');
      const params = new URLSearchParams({ limit: PAGE_SIZE });
      if (startAfter) params.set('startAfter', startAfter);

      const res = await fetch(`${base}?${params}`, { cache: 'no-store', signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('gallery.loadError'));
      return data;
    },
    // `t` volontairement exclu : un changement de langue ne doit pas re-fetch
    // la galerie (les œuvres ne dépendent pas de la locale), seul le message
    // d'erreur ponctuel s'en sert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [techniqueFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    setCursor(null);
    setHasMore(false);

    fetchPage(null, controller.signal)
      .then((data) => {
        setItems(data.items || []);
        setCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchPage(cursor, null)
      .then((data) => {
        setItems((prev) => [...prev, ...(data.items || [])]);
        setCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [cursor, fetchPage]);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loadMore]);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {techniqueLabel && (
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/galerie"
            startIcon={<ArrowBackIcon />}
            variant="text"
            sx={{ mb: 2, pl: 0 }}
          >
            {t('gallery.backToGallery')}
          </Button>
          <Typography variant="h3" component="h1" fontWeight={700}>
            {techniqueLabel}
          </Typography>
        </Box>
      )}

      {!techniqueLabel && (
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          {t('gallery.heading')}
        </Typography>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ color: 'text.secondary' }}>{t('gallery.noArtworks')}</Box>
      ) : (
        <>
          <ArtworkList items={items} />
          <Box ref={sentinelRef} sx={{ height: 1 }} />
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
