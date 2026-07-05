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
  Divider,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ImageUploadField from './ImageUploadField';
import ColorPickerField from './ColorPickerField';
import { techniques, uploadImage, saveSiteConfig, apiUrl } from '../../utils';

const PRESS_TYPES = ['article', 'video', 'interview'];

export default function SiteConfigPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});
  const [heroBlob, setHeroBlob] = useState(null);
  const [techniqueBlobs, setTechniqueBlobs] = useState({});
  const [bioBlob, setBioBlob] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/site-config'))
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  const setSectionSaving = (s, v) => setSaving((p) => ({ ...p, [s]: v }));
  const setSectionError = (s, m) => setErrors((p) => ({ ...p, [s]: m }));

  const saveHero = async () => {
    setSectionSaving('hero', true);
    setSectionError('hero', '');
    try {
      let heroImageUrl = config.heroImageUrl || '';
      if (heroBlob) heroImageUrl = await uploadImage(heroBlob, 'site', `hero_${Date.now()}.jpg`);
      await saveSiteConfig({ heroImageUrl });
      setConfig((c) => ({ ...c, heroImageUrl }));
      setHeroBlob(null);
    } catch (e) {
      setSectionError('hero', e.message);
    } finally {
      setSectionSaving('hero', false);
    }
  };

  const saveTechniques = async () => {
    setSectionSaving('techniques', true);
    setSectionError('techniques', '');
    try {
      const techniqueImages = { ...(config.techniqueImages || {}) };
      await Promise.all(
        Object.entries(techniqueBlobs).map(async ([value, blob]) => {
          techniqueImages[value] = await uploadImage(
            blob,
            'site',
            `technique_${value}_${Date.now()}.jpg`,
          );
        }),
      );
      await saveSiteConfig({ techniqueImages });
      setConfig((c) => ({ ...c, techniqueImages }));
      setTechniqueBlobs({});
    } catch (e) {
      setSectionError('techniques', e.message);
    } finally {
      setSectionSaving('techniques', false);
    }
  };

  const saveBio = async () => {
    setSectionSaving('bio', true);
    setSectionError('bio', '');
    try {
      let biographyImageUrl = config.biographyImageUrl || '';
      if (bioBlob)
        biographyImageUrl = await uploadImage(bioBlob, 'site', `biography_${Date.now()}.jpg`);
      await saveSiteConfig({ biographyImageUrl, biographyText: config.biographyText || '' });
      setConfig((c) => ({ ...c, biographyImageUrl }));
      setBioBlob(null);
    } catch (e) {
      setSectionError('bio', e.message);
    } finally {
      setSectionSaving('bio', false);
    }
  };

  const savePress = async () => {
    setSectionSaving('press', true);
    setSectionError('press', '');
    try {
      await saveSiteConfig({ pressItems: config.pressItems || [] });
    } catch (e) {
      setSectionError('press', e.message);
    } finally {
      setSectionSaving('press', false);
    }
  };

  const saveColors = async () => {
    setSectionSaving('colors', true);
    setSectionError('colors', '');
    try {
      await saveSiteConfig({
        bgColor: config.bgColor || '#ffffff',
        contentColor: config.contentColor || '#020403',
      });
    } catch (e) {
      setSectionError('colors', e.message);
    } finally {
      setSectionSaving('colors', false);
    }
  };

  const saveContact = async () => {
    setSectionSaving('contact', true);
    setSectionError('contact', '');
    try {
      await saveSiteConfig({
        contactEmail: config.contactEmail || '',
        socialInstagram: config.socialInstagram || '',
        socialFacebook: config.socialFacebook || '',
      });
    } catch (e) {
      setSectionError('contact', e.message);
    } finally {
      setSectionSaving('contact', false);
    }
  };

  const updatePressItem = (i, field, value) =>
    setConfig((c) => {
      const pressItems = [...(c.pressItems || [])];
      pressItems[i] = { ...pressItems[i], [field]: value };
      return { ...c, pressItems };
    });

  const addPressItem = () =>
    setConfig((c) => ({
      ...c,
      pressItems: [
        ...(c.pressItems || []),
        { type: 'article', title: '', source: '', date: '', url: '' },
      ],
    }));

  const removePressItem = (i) =>
    setConfig((c) => {
      const pressItems = [...(c.pressItems || [])];
      pressItems.splice(i, 1);
      return { ...c, pressItems };
    });

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Hero */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Image de la page d'accueil (Hero)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxWidth: 480 }}>
            <ImageUploadField
              label="Choisir l'image hero"
              aspect={16 / 9}
              currentUrl={config.heroImageUrl}
              onBlob={setHeroBlob}
              cropTitle="Recadrer le hero (16:9)"
            />
            {errors.hero && (
              <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                {errors.hero}
              </Typography>
            )}
            <Button variant="contained" sx={{ mt: 2 }} onClick={saveHero} disabled={saving.hero}>
              {saving.hero ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Techniques */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Images des techniques (Galerie)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {techniques.map(({ value, label }) => (
              <Box key={value}>
                <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                  {label}
                </Typography>
                <ImageUploadField
                  label="Choisir"
                  aspect={1}
                  currentUrl={config.techniqueImages?.[value]}
                  onBlob={(blob) => setTechniqueBlobs((b) => ({ ...b, [value]: blob }))}
                  cropTitle={`Recadrer — ${label} (1:1)`}
                />
              </Box>
            ))}
          </Box>
          {errors.techniques && (
            <Typography color="error" variant="caption" display="block" sx={{ mt: 2 }}>
              {errors.techniques}
            </Typography>
          )}
          <Button
            variant="contained"
            sx={{ mt: 3 }}
            onClick={saveTechniques}
            disabled={saving.techniques}
          >
            {saving.techniques ? 'Sauvegarde...' : 'Sauvegarder les images'}
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Biographie */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Biographie</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3} sx={{ maxWidth: 720 }}>
            <Box>
              <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                Photo
              </Typography>
              <ImageUploadField
                label="Choisir la photo"
                aspect={1}
                currentUrl={config.biographyImageUrl}
                onBlob={setBioBlob}
                cropTitle="Recadrer la photo de biographie (1:1)"
              />
            </Box>
            <TextField
              label="Texte de la biographie"
              value={config.biographyText || ''}
              onChange={(e) => setConfig((c) => ({ ...c, biographyText: e.target.value }))}
              multiline
              minRows={6}
              fullWidth
            />
            {errors.bio && (
              <Typography color="error" variant="caption">
                {errors.bio}
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
              onClick={saveBio}
              disabled={saving.bio}
            >
              {saving.bio ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Presse */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Articles de presse</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {(config.pressItems || []).map((item, i) => (
              <Box
                key={i}
                sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Typography variant="caption" fontWeight={600}>
                    Article {i + 1}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => removePressItem(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label="Type"
                      value={item.type || 'article'}
                      onChange={(e) => updatePressItem(i, 'type', e.target.value)}
                      size="small"
                      sx={{ width: 130 }}
                      SelectProps={{ native: true }}
                    >
                      {PRESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </TextField>
                    <TextField
                      label="Date"
                      type="date"
                      value={item.date || ''}
                      onChange={(e) => updatePressItem(i, 'date', e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                  </Stack>
                  <TextField
                    label="Titre"
                    value={item.title || ''}
                    onChange={(e) => updatePressItem(i, 'title', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Source / Publication"
                      value={item.source || ''}
                      onChange={(e) => updatePressItem(i, 'source', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="URL (optionnel)"
                      value={item.url || ''}
                      onChange={(e) => updatePressItem(i, 'url', e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={addPressItem}
              sx={{ alignSelf: 'flex-start' }}
            >
              Ajouter un article
            </Button>
            <Divider />
            {errors.press && (
              <Typography color="error" variant="caption">
                {errors.press}
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
              onClick={savePress}
              disabled={saving.press}
            >
              {saving.press ? 'Sauvegarde...' : 'Sauvegarder la presse'}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Contact & Réseaux sociaux */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Contact &amp; Réseaux sociaux</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label="Email de contact"
              type="email"
              value={config.contactEmail || ''}
              onChange={(e) => setConfig((c) => ({ ...c, contactEmail: e.target.value }))}
              size="small"
              fullWidth
              placeholder="artiste@exemple.com"
            />
            <TextField
              label="URL Instagram"
              value={config.socialInstagram || ''}
              onChange={(e) => setConfig((c) => ({ ...c, socialInstagram: e.target.value }))}
              size="small"
              fullWidth
              placeholder="https://instagram.com/..."
            />
            <TextField
              label="URL Facebook"
              value={config.socialFacebook || ''}
              onChange={(e) => setConfig((c) => ({ ...c, socialFacebook: e.target.value }))}
              size="small"
              fullWidth
              placeholder="https://facebook.com/..."
            />
            {errors.contact && (
              <Typography color="error" variant="caption">
                {errors.contact}
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
              onClick={saveContact}
              disabled={saving.contact}
            >
              {saving.contact ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Couleurs du site */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Couleurs du site</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3} sx={{ maxWidth: 320 }}>
            <ColorPickerField
              label="Couleur de fond"
              value={config.bgColor || '#ffffff'}
              onChange={(color) => setConfig((c) => ({ ...c, bgColor: color }))}
              category="bg"
            />
            <ColorPickerField
              label="Couleur du contenu"
              value={config.contentColor || '#020403'}
              onChange={(color) => setConfig((c) => ({ ...c, contentColor: color }))}
              category="content"
            />
            {errors.colors && (
              <Typography color="error" variant="caption">
                {errors.colors}
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
              onClick={saveColors}
              disabled={saving.colors}
            >
              {saving.colors ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
