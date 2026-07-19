import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useTranslation } from 'react-i18next';
import { techniques, uploadImage, authFetch, apiUrl } from '../../utils';

export default function EditArtworkDialog({ artwork, onClose, onSaved, onDeleted }) {
  const { t } = useTranslation();
  const open = Boolean(artwork);
  const extraInputRef = useRef(null);

  const [form, setForm] = useState({
    image: null,
    title: '',
    technique: '',
    height: '',
    width: '',
    year: '',
    comment: '',
    imageUrl: '',
  });
  const [extraImages, setExtraImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (artwork) {
      setForm({
        image: null,
        title: artwork.title || '',
        technique: artwork.technique || '',
        height: artwork.height ?? '',
        width: artwork.width ?? '',
        year: artwork.year ?? '',
        comment: artwork.comment || '',
        imageUrl: artwork.imageUrl || '',
      });
      setExtraImages((artwork.additionalImages || []).map((url) => ({ url })));
      setError('');
      setConfirmDelete(false);
    }
  }, [artwork]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleMainFile = (e) => setForm((f) => ({ ...f, image: e.target.files?.[0] ?? null }));

  const handleExtraFiles = (e) => {
    const files = Array.from(e.target.files || []);
    setExtraImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  };

  const removeExtra = (i) => {
    setExtraImages((prev) => {
      const entry = prev[i];
      if (entry.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleClose = () => {
    setConfirmDelete(false);
    setError('');
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.technique) {
      setError(t('editArtworkDialog.errRequiredTitleTechnique'));
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl;
      if (form.image)
        imageUrl = await uploadImage(form.image, 'artworks', `artwork_${Date.now()}.jpg`);

      const additionalImages = await Promise.all(
        extraImages.map((entry) =>
          entry.url
            ? Promise.resolve(entry.url)
            : uploadImage(entry.file, 'artworks', `extra_${Date.now()}.jpg`),
        ),
      );

      const res = await authFetch(apiUrl(`/admin/artworks/${artwork.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          technique: form.technique,
          height: Number(form.height),
          width: Number(form.width),
          year: form.year ? Number(form.year) : null,
          comment: form.comment || '',
          imageUrl,
          additionalImages,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('editArtworkDialog.errUpdate'));
      onSaved?.(data);
    } catch (err) {
      setError(err.message || t('editArtworkDialog.errGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await authFetch(apiUrl(`/admin/artworks/${artwork.id}`), { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t('editArtworkDialog.errDelete'));
      }
      onDeleted?.();
    } catch (err) {
      setError(err.message || t('editArtworkDialog.errGeneric'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('editArtworkDialog.title')}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Button variant="outlined" component="label">
              {form.image
                ? t('editArtworkDialog.changeImage')
                : t('editArtworkDialog.replaceMainImage')}
              <input hidden accept="image/*" type="file" onChange={handleMainFile} />
            </Button>
            {form.image && (
              <Typography variant="caption" color="text.secondary">
                {t('editArtworkDialog.newFileLabel', { name: form.image.name })}
              </Typography>
            )}
            {!form.image && form.imageUrl && (
              <Box
                component="img"
                src={form.imageUrl}
                alt={form.title}
                sx={{ height: 100, width: 'auto', objectFit: 'contain', borderRadius: 1 }}
              />
            )}
            <TextField
              label={t('editArtworkDialog.titleLabel')}
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel id="edit-technique-label">
                {t('editArtworkDialog.techniqueLabel')}
              </InputLabel>
              <Select
                labelId="edit-technique-label"
                label={t('editArtworkDialog.techniqueLabel')}
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
                label={t('editArtworkDialog.heightLabel')}
                name="height"
                value={form.height}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
              <Typography variant="body2">x</Typography>
              <TextField
                label={t('editArtworkDialog.widthLabel')}
                name="width"
                value={form.width}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0 }}
              />
            </Stack>
            <TextField
              label={t('editArtworkDialog.yearLabel')}
              name="year"
              value={form.year}
              onChange={handleChange}
              type="number"
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label={t('editArtworkDialog.commentLabel')}
              name="comment"
              value={form.comment}
              onChange={handleChange}
              multiline
              minRows={2}
              fullWidth
            />
            <Box>
              <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {t('editArtworkDialog.extraImages')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {extraImages.map((entry, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 80, height: 80 }}>
                    <Box
                      component="img"
                      src={entry.url || entry.preview}
                      alt=""
                      sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeExtra(i)}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 0.3,
                        '&:hover': { bgcolor: 'error.light', color: 'white' },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
                <Box
                  onClick={() => extraInputRef.current?.click()}
                  sx={{
                    width: 80,
                    height: 80,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ color: 'text.disabled' }} />
                </Box>
                <input
                  ref={extraInputRef}
                  hidden
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleExtraFiles}
                />
              </Box>
            </Box>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            color="error"
            variant={confirmDelete ? 'contained' : 'outlined'}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? t('editArtworkDialog.deleting')
              : confirmDelete
                ? t('editArtworkDialog.confirmDelete')
                : t('editArtworkDialog.delete')}
          </Button>
          <Stack direction="row" spacing={1}>
            {confirmDelete && (
              <Button onClick={() => setConfirmDelete(false)}>
                {t('editArtworkDialog.cancel')}
              </Button>
            )}
            {!confirmDelete && (
              <>
                <Button onClick={handleClose}>{t('editArtworkDialog.cancel')}</Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? t('editArtworkDialog.saving') : t('editArtworkDialog.save')}
                </Button>
              </>
            )}
          </Stack>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
