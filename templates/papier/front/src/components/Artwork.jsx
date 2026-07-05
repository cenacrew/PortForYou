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
            style={{ borderRadius: 2, width: '100%', height: 'auto' }}
          />
        ) : (
          <Box
            sx={{
              borderRadius: 2,
              bgcolor: 'action.hover',
              height: 200,
            }}
          />
        )}
        {item.title && (
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '1.05rem',
              }}
            >
              {item.title}
            </Typography>
            {(item.height || item.width) && (
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.65, letterSpacing: '0.05em' }}>
                {item.height} × {item.width} cm{item.year ? ` — ${item.year}` : ''}
              </Typography>
            )}
          </Box>
        )}
      </Link>
    </ImageListItem>
  );
}
