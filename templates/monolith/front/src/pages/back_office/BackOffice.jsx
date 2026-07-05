import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Typography,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import AddArtworkDialog from '../../components/back_office/AddArtworkDialog';
import EditArtworkDialog from '../../components/back_office/EditArtworkDialog';
import SiteConfigPanel from '../../components/back_office/SiteConfigPanel';
import NewsPanel from '../../components/back_office/NewsPanel';
import { apiUrl } from '../../utils';

const NAV = [
  { id: 'artworks', label: 'Oeuvres', icon: <ImageIcon fontSize="small" /> },
  { id: 'news', label: 'Actualites', icon: <EventIcon fontSize="small" /> },
  { id: 'config', label: 'Contenu du site', icon: <SettingsIcon fontSize="small" /> },
];

export default function BackOffice() {
  const navigate = useNavigate();
  const [section, setSection] = useState('artworks');
  const [openAdd, setOpenAdd] = useState(false);
  const [editArtwork, setEditArtwork] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('logged_in');
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/artworks'));
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      setArtworks(data.items || []);
    } catch (e) {
      console.error('Erreur chargement oeuvres:', e);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  const currentNav = NAV.find((n) => n.id === section) || NAV[0];

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      <Box
        sx={{
          width: 220,
          bgcolor: '#020403',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          py: 3,
          px: 1.5,
          flexShrink: 0,
          gap: 0.5,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 2,
            fontSize: 10,
            px: 1,
            mb: 1.5,
            display: 'block',
          }}
        >
          Administration
        </Typography>
        {NAV.map((item) => (
          <Button
            key={item.id}
            onClick={() => setSection(item.id)}
            startIcon={item.icon}
            fullWidth
            sx={{
              justifyContent: 'flex-start',
              px: 1.5,
              py: 1.1,
              borderRadius: 1,
              color: section === item.id ? '#a142f4' : 'rgba(255,255,255,0.6)',
              bgcolor: section === item.id ? 'rgba(161,66,244,0.12)' : 'transparent',
              fontWeight: section === item.id ? 700 : 400,
              fontSize: '0.875rem',
              textTransform: 'none',
              letterSpacing: 0.2,
              transition: 'all 0.15s',
              '&:hover': {
                bgcolor: section === item.id ? 'rgba(161,66,244,0.16)' : 'rgba(255,255,255,0.05)',
                color: section === item.id ? '#a142f4' : 'rgba(255,255,255,0.9)',
              },
              '& .MuiButton-startIcon': {
                color: section === item.id ? '#a142f4' : 'rgba(255,255,255,0.35)',
              },
            }}
          >
            {item.label}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={logout}
          startIcon={<LogoutIcon fontSize="small" />}
          fullWidth
          sx={{
            justifyContent: 'flex-start',
            px: 1.5,
            py: 1.1,
            borderRadius: 1,
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'none',
            fontSize: '0.875rem',
            '&:hover': { color: '#ef5350', bgcolor: 'rgba(239,83,80,0.08)' },
            '& .MuiButton-startIcon': { color: 'inherit' },
          }}
        >
          Deconnexion
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 4,
            py: 2.5,
            bgcolor: 'white',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: -0.3 }}>
            {currentNav.label}
          </Typography>
          {section === 'artworks' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAdd(true)}
              sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, px: 2.5 }}
            >
              Ajouter une oeuvre
            </Button>
          )}
        </Box>

        <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
          {section === 'artworks' &&
            (loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
              </Box>
            ) : artworks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <ImageIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                <Typography color="text.secondary">Aucune oeuvre pour l instant.</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 2,
                }}
              >
                {artworks.map((artwork) => (
                  <Card
                    key={artwork.id}
                    elevation={0}
                    onClick={() => setEditArtwork(artwork)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      borderRadius: 2,
                      overflow: 'hidden',
                      transition: 'all 0.18s',
                      '&:hover': {
                        borderColor: 'secondary.main',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(161,66,244,0.13)',
                      },
                    }}
                  >
                    {artwork.imageUrl ? (
                      <CardMedia
                        component="img"
                        height="130"
                        image={artwork.imageUrl}
                        alt={artwork.title}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 130,
                          bgcolor: '#efefef',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ImageIcon sx={{ color: '#ccc', fontSize: 30 }} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        noWrap
                        display="block"
                        sx={{ fontSize: '0.8rem', mb: 0.3 }}
                      >
                        {artwork.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        display="block"
                        sx={{ fontSize: '0.72rem' }}
                      >
                        {artwork.technique}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ))}
          {section === 'news' && <NewsPanel />}
          {section === 'config' && <SiteConfigPanel />}
        </Box>
      </Box>

      <AddArtworkDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSaved={() => {
          setOpenAdd(false);
          fetchArtworks();
        }}
      />
      <EditArtworkDialog
        artwork={editArtwork}
        onClose={() => setEditArtwork(null)}
        onSaved={() => {
          setEditArtwork(null);
          fetchArtworks();
        }}
        onDeleted={() => {
          setEditArtwork(null);
          fetchArtworks();
        }}
      />
    </Box>
  );
}
