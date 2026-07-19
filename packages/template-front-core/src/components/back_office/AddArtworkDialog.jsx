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
import { useTranslation } from 'react-i18next';
import { techniques, uploadImage, authFetch, apiUrl } from '../../utils';

export default function AddArtworkDialog({ open, onClose, onSaved }) {
  const { t } = useTranslation();
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
      setError(t('addArtworkDialog.errRequiredTitleTechnique'));
      return;
    }
    if (!form.image) {
      setError(t('addArtworkDialog.errRequiredImage'));
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
      if (!res.ok) throw new Error(data?.error || t('addArtworkDialog.errCreate'));
      onSaved?.(data);
      handleClose();
    } catch (err) {
      setError(err.message || t('addArtworkDialog.errGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('addArtworkDialog.title')}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Button variant="outlined" component="label">
              {t('addArtworkDialog.importImage')}
              <input hidden accept="image/*" type="file" onChange={handleFile} />
            </Button>
            {form.image && (
              <Typography variant="caption" color="text.secondary">
                {t('addArtworkDialog.fileLabel', { name: form.image.name })}
              </Typography>
            )}
            <TextField
              label={t('addArtworkDialog.titleLabel')}
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel id="technique-label">{t('addArtworkDialog.techniqueLabel')}</InputLabel>
              <Select
                labelId="technique-label"
                label={t('addArtworkDialog.techniqueLabel')}
                name="technique"
                value={form.technique}
                onChange={handleChange}
              >
                {techniques.map((tech) => (
                  <MenuItem key={tech.value} value={tech.value}>
                    {t(`techniques.${tech.value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label={t('addArtworkDialog.heightLabel')}
                name="height"
                value={form.height}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
              <Typography variant="body2">x</Typography>
              <TextField
                label={t('addArtworkDialog.widthLabel')}
                name="width"
                value={form.width}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
            </Stack>
            <TextField
              label={t('addArtworkDialog.yearLabel')}
              name="year"
              value={form.year}
              onChange={handleChange}
              type="number"
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label={t('addArtworkDialog.commentLabel')}
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
          <Button onClick={handleClose}>{t('addArtworkDialog.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('addArtworkDialog.saving') : t('addArtworkDialog.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
