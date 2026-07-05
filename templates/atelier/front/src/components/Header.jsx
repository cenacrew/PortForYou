import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { NavLink as RouterLink } from 'react-router-dom';

const pages = [
  { label: 'Accueil', to: '/' },
  { label: 'Biographie', to: '/biographie' },
  { label: 'Galerie', to: '/galerie' },
  { label: 'Presse', to: '/presse' },
  { label: 'Contact', to: '/contact' },
];

export default function Header() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              fontWeight: 700,
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Prénom Nom
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {pages.map((page) => (
              <Button
                key={page.to}
                component={RouterLink}
                to={page.to}
                color="inherit"
                sx={{
                  '&:hover': { bgcolor: 'transparent', opacity: 0.7 },
                  '&.active': {
                    opacity: 0.45,
                    bgcolor: 'transparent',
                    '&:hover': { opacity: 0.7 },
                  },
                }}
              >
                {page.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
