import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { techniques, uploadImage, authFetch, apiUrl } from '../../utils';

export default function AddArtworkDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    image: null,
    title: '',
    technique: '',
    height: '',
    width: '',
    year: '',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleFile = (e) => setForm((f) => ({ ...f, image: e.target.files?.[0] ?? null }));
  const resetForm = () =>
    setForm({
      image: null,
      title: '',
      technique: '',
      height: '',
      width: '',
      year: '',
      comment: '',
    });
  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.technique) {
      setError('Titre et technique sont requis.');
      return;
    }
    if (!form.image) {
      setError('Une image est requise.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await uploadImage(form.image, 'artworks', `artwork_${Date.now()}.jpg`);
      const res = await authFetch(apiUrl('/admin/artworks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          technique: form.technique,
          height: Number(form.height),
          width: Number(form.width),
          year: form.year ? Number(form.year) : null,
          comment: form.comment || '',
          imageUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erreur lors de la creation');
      onSaved?.(data);
      handleClose();
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Ajouter une oeuvre</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Button variant="outlined" component="label">
              Importer une image
              <input hidden accept="image/*" type="file" onChange={handleFile} />
            </Button>
            {form.image && (
              <Typography variant="caption" color="text.secondary">
                Fichier : {form.image.name}
              </Typography>
            )}
            <TextField
              label="Titre"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel id="technique-label">Technique</InputLabel>
              <Select
                labelId="technique-label"
                label="Technique"
                name="technique"
                value={form.technique}
                onChange={handleChange}
              >
                {techniques.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Hauteur (cm)"
                name="height"
                value={form.height}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
              <Typography variant="body2">x</Typography>
              <TextField
                label="Largeur (cm)"
                name="width"
                value={form.width}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
            </Stack>
            <TextField
              label="Annee"
              name="year"
              value={form.year}
              onChange={handleChange}
              type="number"
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Commentaire (optionnel)"
              name="comment"
              value={form.comment}
              onChange={handleChange}
              multiline
              minRows={2}
              fullWidth
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
