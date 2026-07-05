import React from 'react';
import { ImageListItem, Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

/**
 * Artwork component: renders a single artwork tile for the gallery.
 * Props:
 * - item: { id: string|number, imageUrl?: string, title?: string }
 */
export default function Artwork({ item }) {
  if (!item) return null;

  return (
    <ImageListItem key={item.id}>
      <Link to={`/galerie/${item.id}`} state={{ item }} style={{ display: 'block' }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title || ''}
            loading="lazy"
            style={{ borderRadius: 0, width: '100%', height: 'auto' }}
          />
        ) : (
          <Box
            sx={{
              borderRadius: 0,
              bgcolor: 'action.hover',
              height: 320,
            }}
          />
        )}
        {item.title && (
          <Typography
            sx={{
              mt: 1.5,
              fontFamily: "'Archivo Black', sans-serif",
              textTransform: 'uppercase',
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
            }}
          >
            {item.title}
          </Typography>
        )}
      </Link>
    </ImageListItem>
  );
}
