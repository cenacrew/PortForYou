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
import { useTranslation } from 'react-i18next';
import ImageUploadField from './ImageUploadField';
import ColorPickerField from './ColorPickerField';
import { techniques, uploadImage, saveSiteConfig, apiUrl } from '../../utils';

const PRESS_TYPES = ['article', 'video', 'interview'];

export default function SiteConfigPanel() {
  const { t } = useTranslation();
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

  const saveSeo = async () => {
    setSectionSaving('seo', true);
    setSectionError('seo', '');
    try {
      await saveSiteConfig({
        siteName: config.siteName || '',
        siteDescription: config.siteDescription || '',
      });
    } catch (e) {
      setSectionError('seo', e.message);
    } finally {
      setSectionSaving('seo', false);
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
      {/* Référencement (SEO) */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.seo.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label={t('siteConfigPanel.seo.siteNameLabel')}
              value={config.siteName || ''}
              onChange={(e) => setConfig((c) => ({ ...c, siteName: e.target.value }))}
              size="small"
              fullWidth
              placeholder={t('siteConfigPanel.seo.siteNamePlaceholder')}
              helperText={t('siteConfigPanel.seo.siteNameHelper')}
            />
            <TextField
              label={t('siteConfigPanel.seo.descriptionLabel')}
              value={config.siteDescription || ''}
              onChange={(e) => setConfig((c) => ({ ...c, siteDescription: e.target.value }))}
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder={t('siteConfigPanel.seo.descriptionPlaceholder')}
              helperText={t('siteConfigPanel.seo.descriptionHelper')}
            />
            {errors.seo && (
              <Typography color="error" variant="caption">
                {errors.seo}
              </Typography>
            )}
            <Button
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
              onClick={saveSeo}
              disabled={saving.seo}
            >
              {saving.seo ? t('common.saving') : t('common.save')}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Hero */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.hero.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxWidth: 480 }}>
            <ImageUploadField
              label={t('siteConfigPanel.hero.chooseImage')}
              aspect={16 / 9}
              currentUrl={config.heroImageUrl}
              onBlob={setHeroBlob}
              cropTitle={t('siteConfigPanel.hero.cropTitle')}
            />
            {errors.hero && (
              <Typography color="error" variant="caption" display="block" sx={{ mt: 1 }}>
                {errors.hero}
              </Typography>
            )}
            <Button variant="contained" sx={{ mt: 2 }} onClick={saveHero} disabled={saving.hero}>
              {saving.hero ? t('common.saving') : t('common.save')}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Techniques */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.techniquesSection.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {techniques.map(({ value }) => {
              const label = t(`techniques.${value}`);
              return (
                <Box key={value}>
                  <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    {label}
                  </Typography>
                  <ImageUploadField
                    label={t('siteConfigPanel.techniquesSection.choose')}
                    aspect={1}
                    currentUrl={config.techniqueImages?.[value]}
                    onBlob={(blob) => setTechniqueBlobs((b) => ({ ...b, [value]: blob }))}
                    cropTitle={t('siteConfigPanel.techniquesSection.cropTitle', { label })}
                  />
                </Box>
              );
            })}
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
            {saving.techniques ? t('common.saving') : t('siteConfigPanel.techniquesSection.save')}
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Biographie */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.biographySection.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3} sx={{ maxWidth: 720 }}>
            <Box>
              <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
                {t('siteConfigPanel.biographySection.photoLabel')}
              </Typography>
              <ImageUploadField
                label={t('siteConfigPanel.biographySection.choosePhoto')}
                aspect={1}
                currentUrl={config.biographyImageUrl}
                onBlob={setBioBlob}
                cropTitle={t('siteConfigPanel.biographySection.cropTitle')}
              />
            </Box>
            <TextField
              label={t('siteConfigPanel.biographySection.textLabel')}
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
              {saving.bio ? t('common.saving') : t('common.save')}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Presse */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.pressSection.heading')}</Typography>
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
                    {t('siteConfigPanel.pressSection.articleLabel', { n: i + 1 })}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => removePressItem(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label={t('siteConfigPanel.pressSection.typeLabel')}
                      value={item.type || 'article'}
                      onChange={(e) => updatePressItem(i, 'type', e.target.value)}
                      size="small"
                      sx={{ width: 130 }}
                      SelectProps={{ native: true }}
                    >
                      {PRESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </TextField>
                    <TextField
                      label={t('siteConfigPanel.pressSection.dateLabel')}
                      type="date"
                      value={item.date || ''}
                      onChange={(e) => updatePressItem(i, 'date', e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 160 }}
                    />
                  </Stack>
                  <TextField
                    label={t('siteConfigPanel.pressSection.titleLabel')}
                    value={item.title || ''}
                    onChange={(e) => updatePressItem(i, 'title', e.target.value)}
                    size="small"
                    fullWidth
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label={t('siteConfigPanel.pressSection.sourceLabel')}
                      value={item.source || ''}
                      onChange={(e) => updatePressItem(i, 'source', e.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label={t('siteConfigPanel.pressSection.urlLabel')}
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
              {t('siteConfigPanel.pressSection.addArticle')}
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
              {saving.press ? t('common.saving') : t('siteConfigPanel.pressSection.save')}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Contact & Réseaux sociaux */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.contactSection.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2} sx={{ maxWidth: 480 }}>
            <TextField
              label={t('siteConfigPanel.contactSection.emailLabel')}
              type="email"
              value={config.contactEmail || ''}
              onChange={(e) => setConfig((c) => ({ ...c, contactEmail: e.target.value }))}
              size="small"
              fullWidth
              placeholder={t('siteConfigPanel.contactSection.emailPlaceholder')}
            />
            <TextField
              label={t('siteConfigPanel.contactSection.instagramLabel')}
              value={config.socialInstagram || ''}
              onChange={(e) => setConfig((c) => ({ ...c, socialInstagram: e.target.value }))}
              size="small"
              fullWidth
              placeholder={t('siteConfigPanel.contactSection.instagramPlaceholder')}
            />
            <TextField
              label={t('siteConfigPanel.contactSection.facebookLabel')}
              value={config.socialFacebook || ''}
              onChange={(e) => setConfig((c) => ({ ...c, socialFacebook: e.target.value }))}
              size="small"
              fullWidth
              placeholder={t('siteConfigPanel.contactSection.facebookPlaceholder')}
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
              {saving.contact ? t('common.saving') : t('common.save')}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Couleurs du site */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>{t('siteConfigPanel.colorsSection.heading')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3} sx={{ maxWidth: 320 }}>
            <ColorPickerField
              label={t('siteConfigPanel.colorsSection.bgLabel')}
              value={config.bgColor || '#ffffff'}
              onChange={(color) => setConfig((c) => ({ ...c, bgColor: color }))}
              category="bg"
            />
            <ColorPickerField
              label={t('siteConfigPanel.colorsSection.contentLabel')}
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
              {saving.colors ? t('common.saving') : t('common.save')}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
