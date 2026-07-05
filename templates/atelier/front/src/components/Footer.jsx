import React from 'react';
import { Box, Typography } from '@mui/material';

export default function Footer() {
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
        © {new Date().getFullYear()} Prénom Nom. Tous droits réservés.
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Reproduction interdite sans autorisation.
      </Typography>
    </Box>
  );
}
