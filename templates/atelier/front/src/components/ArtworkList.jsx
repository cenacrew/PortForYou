import React from 'react';
import { ImageList } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Artwork from './Artwork';

/**
 * ArtworkList component: renders a responsive masonry grid of artworks.
 * Props:
 * - items: Array<{ id: string|number, imageUrl?: string, title?: string }>
 */
export default function ArtworkList({ items = [] }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));
  const cols = isMdUp ? 3 : isSmUp ? 2 : 1;

  if (!items || items.length === 0) return null;

  return (
    <ImageList variant="masonry" cols={cols} gap={8}>
      {items.map((item) => (
        <Artwork key={item.id} item={item} />
      ))}
    </ImageList>
  );
}
