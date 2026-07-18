import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import ImageUploadField from './ImageUploadField';
import { uploadImage, saveSiteConfig, apiUrl } from '../../utils';

const EMPTY_ITEM = {
  title: '',
  date: '',
  endDate: '',
  location: '',
  description: '',
  imageUrl: '',
  link: '',
};

export default function NewsPanel() {
  const [items, setItems] = useState([]);
  const [blobs, setBlobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/site-config'))
      .then((r) => r.json())
      .then((data) =>
        setItems([...(data.newsItems || [])].sort((a, b) => new Date(b.date) - new Date(a.date))),
      )
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const updateItem = (i, field, value) =>
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  const addItem = () => setItems((prev) => [{ ...EMPTY_ITEM }, ...prev]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const newsItems = [...items];
      await Promise.all(
        Object.entries(blobs).map(async ([idx, blob]) => {
          if (blob)
            newsItems[Number(idx)] = {
              ...newsItems[Number(idx)],
              imageUrl: await uploadImage(blob, 'site', `news_${idx}_${Date.now()}.jpg`),
            };
        }),
      );
      await saveSiteConfig({ newsItems });
      setItems(newsItems);
      setBlobs({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {items.length} actualite{items.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={addItem}
          sx={{ textTransform: 'none', borderRadius: 1 }}
        >
          Ajouter une actualite
        </Button>
      </Box>
      <Stack spacing={1.5}>
        {items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <EventIcon sx={{ fontSize: 44, opacity: 0.25, mb: 1.5 }} />
            <Typography variant="body2">
              Aucune actualite. Cliquez sur Ajouter pour commencer.
            </Typography>
          </Box>
        )}
        {items.map((item, i) => (
          <Accordion
            key={i}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
              bgcolor: 'white',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flex: 1,
                  mr: 1,
                  minWidth: 0,
                }}
              >
                <EventIcon sx={{ fontSize: 18, color: 'secondary.main', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap sx={{ fontSize: '0.875rem' }}>
                    {item.title || 'Nouvelle actualite'}
                  </Typography>
                  {item.date && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {item.location ? ` — ${item.location}` : ''}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(i);
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={2}>
                <TextField
                  label="Titre *"
                  value={item.title || ''}
                  onChange={(e) => updateItem(i, 'title', e.target.value)}
                  fullWidth
                  size="small"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label="Date de debut *"
                    type="date"
                    value={item.date || ''}
                    onChange={(e) => updateItem(i, 'date', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Date de fin (optionnel)"
                    type="date"
                    value={item.endDate || ''}
                    onChange={(e) => updateItem(i, 'endDate', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <TextField
                  label="Lieu"
                  value={item.location || ''}
                  onChange={(e) => updateItem(i, 'location', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Galerie XY, 12 rue de la Paix, Paris"
                />
                <TextField
                  label="Description (optionnel)"
                  value={item.description || ''}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                />
                <TextField
                  label="Lien externe (optionnel)"
                  value={item.link || ''}
                  onChange={(e) => updateItem(i, 'link', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="https://..."
                />
                <Box>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    Image (optionnel, 16:9)
                  </Typography>
                  <ImageUploadField
                    label="Choisir une image"
                    aspect={16 / 9}
                    currentUrl={item.imageUrl}
                    onBlob={(blob) => setBlobs((b) => ({ ...b, [i]: blob }))}
                    cropTitle="Recadrer l image (16:9)"
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || items.length === 0}
          sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 600, px: 3 }}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        {error && (
          <Typography color="error" variant="caption">
            {error}
          </Typography>
        )}
        {success && (
          <Typography color="success.main" variant="caption" fontWeight={600}>
            Sauvegarde avec succes
          </Typography>
        )}
      </Box>
    </Box>
  );
}
