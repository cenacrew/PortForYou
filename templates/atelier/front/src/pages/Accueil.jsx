import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Box, Typography, IconButton, Chip, Button, TextField, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import MicIcon from '@mui/icons-material/Mic';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Link } from 'react-router-dom';
import { techniques } from '../utils';
import { useSiteConfig } from '../contexts/SiteConfigContext';

const TYPE_CONFIG = {
  article: { label: 'Article', icon: <ArticleIcon sx={{ fontSize: 14 }} />, color: 'default' },
  video: {
    label: 'Video',
    icon: <PlayCircleOutlineIcon sx={{ fontSize: 14 }} />,
    color: 'secondary',
  },
  interview: { label: 'Interview', icon: <MicIcon sx={{ fontSize: 14 }} />, color: 'default' },
};

function formatDateRange(dateStr, endDateStr) {
  const start = new Date(dateStr + 'T12:00:00');
  const startLabel = start.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (!endDateStr) return startLabel;
  const end = new Date(endDateStr + 'T12:00:00');
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function NewsItem({ item }) {
  const dateLabel = formatDateRange(item.date, item.endDate || '');
  const hasImage = !!item.imageUrl;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'center' },
        gap: { xs: 3, md: 0 },
        py: { xs: 5, md: 7 },
        borderTop: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: '1px solid', borderColor: 'divider' },
      }}
    >
      {hasImage && (
        <Box
          sx={{ flexShrink: 0, width: { xs: '100%', md: 300 }, mr: { md: 6 }, overflow: 'hidden' }}
        >
          <Box
            component="img"
            src={item.imageUrl}
            alt={item.title}
            sx={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.5s ease',
              '&:hover': { transform: 'scale(1.04)' },
            }}
          />
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          ...(!hasImage ? { borderLeft: '3px solid', borderColor: 'primary.main', pl: 3 } : {}),
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: 'text.disabled',
            letterSpacing: 2,
            fontSize: '0.68rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {dateLabel}
        </Typography>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, lineHeight: 1.2, letterSpacing: -0.5 }}
        >
          {item.title}
        </Typography>
        {item.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <LocationOnIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              {item.location}
            </Typography>
          </Box>
        )}
        {item.description && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.75, maxWidth: 560 }}
          >
            {item.description}
          </Typography>
        )}
        {item.link && (
          <Box sx={{ mt: 0.5 }}>
            <Button
              component="a"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
              sx={{
                borderRadius: 0,
                textTransform: 'none',
                fontSize: '0.8rem',
                letterSpacing: 0.5,
                px: 2.5,
                py: 0.8,
                color: 'text.primary',
                borderColor: 'text.primary',
                '&:hover': { bgcolor: 'text.primary', color: 'white', borderColor: 'text.primary' },
              }}
            >
              En savoir plus
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function PressCard({ item }) {
  const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.article;
  const formattedDate = new Date(item.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <Box
      component={item.url ? 'a' : 'div'}
      href={item.url || undefined}
      target={item.url ? '_blank' : undefined}
      rel={item.url ? 'noopener noreferrer' : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 2.5,
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
        textDecoration: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': item.url ? { transform: 'translateY(-2px)', boxShadow: 3 } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chip
          icon={conf.icon}
          label={conf.label}
          size="small"
          color={conf.color}
          variant="outlined"
          sx={{ fontSize: 11, height: 22 }}
        />
        {item.url && <OpenInNewIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </Box>
      <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.3 }}>
        {item.title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.primary" fontWeight={600}>
          {item.source}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          ·
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {formattedDate}
        </Typography>
      </Box>
    </Box>
  );
}

function ContactSection({ config }) {
  const email = config?.contactEmail || '';
  const instagram = config?.socialInstagram || '';
  const facebook = config?.socialFacebook || '';
  const socials = [
    instagram && {
      label: 'Instagram',
      icon: <InstagramIcon sx={{ fontSize: 18 }} />,
      url: instagram,
    },
    facebook && { label: 'Facebook', icon: <FacebookIcon sx={{ fontSize: 18 }} />, url: facebook },
  ].filter(Boolean);

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <Box sx={{ py: 10, px: { xs: 4, md: 8, lg: 12 }, bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Typography variant="h3" component="h2" fontWeight={700} textAlign="center" sx={{ mb: 8 }}>
          Contact
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 6, md: 10 },
            alignItems: 'start',
          }}
        >
          <Box>
            {sent ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Message envoyé
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Merci, je vous répondrai dans les plus brefs délais.
                </Typography>
              </Box>
            ) : (
              <Stack component="form" spacing={2.5} noValidate onSubmit={handleSubmit}>
                <TextField
                  label="Nom"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  fullWidth
                  multiline
                  minRows={5}
                  variant="outlined"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{ alignSelf: 'flex-start', borderRadius: 0, px: 5, letterSpacing: 1 }}
                >
                  Envoyer
                </Button>
              </Stack>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: { xs: 0, md: 1 } }}>
            {email && (
              <Box>
                <Typography variant="overline" color="text.disabled" letterSpacing={2}>
                  Email
                </Typography>
                <Typography
                  component="a"
                  href={`mailto:${email}`}
                  variant="body1"
                  display="block"
                  sx={{
                    mt: 0.5,
                    color: 'text.primary',
                    textDecoration: 'none',
                    '&:hover': { color: 'secondary.main' },
                  }}
                >
                  {email}
                </Typography>
              </Box>
            )}
            {socials.length > 0 && (
              <Box>
                <Typography variant="overline" color="text.disabled" letterSpacing={2}>
                  Retrouvez l artiste sur
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                  {socials.map(({ label, icon, url }) => (
                    <Button
                      key={label}
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      startIcon={icon}
                      sx={{ borderRadius: 0, textTransform: 'none', letterSpacing: 0.5 }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <Box
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      sx={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 44,
        height: 44,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: 3,
        zIndex: 1200,
        transition: 'opacity 0.2s, transform 0.2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 },
      }}
    >
      <ExpandMoreIcon sx={{ transform: 'rotate(180deg)', fontSize: 22 }} />
    </Box>
  );
}

export default function Accueil() {
  const galleryRef = useRef(null);
  const config = useSiteConfig();

  const heroImageUrl = config?.heroImageUrl || '/placeholder-hero.svg';
  const techniqueImages = config?.techniqueImages || {};
  const biographyImageUrl = config?.biographyImageUrl || null;
  const biographyText =
    config?.biographyText ||
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
  const pressItems = config?.pressItems || [];
  const rawNewsItems = (config?.newsItems || []).filter((n) => n.title && n.date);
  const newsItems = useMemo(
    () => [...rawNewsItems].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [rawNewsItems],
  );

  const scrollToGallery = () => galleryRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          height: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: 'common.white',
          backgroundImage: `url('${heroImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <IconButton
          onClick={scrollToGallery}
          aria-label="Scroll vers la galerie"
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': { transform: 'translateX(-50%) translateY(0)' },
              '40%': { transform: 'translateX(-50%) translateY(-12px)' },
              '60%': { transform: 'translateX(-50%) translateY(-6px)' },
            },
          }}
        >
          <ExpandMoreIcon sx={{ fontSize: 48 }} />
        </IconButton>
      </Box>

      {/* Galerie */}
      <Box
        ref={galleryRef}
        sx={{ pt: 4, pb: 10, px: { xs: 4, md: 8, lg: 12 }, bgcolor: 'background.default' }}
      >
        <Typography variant="h3" component="h2" fontWeight={700} textAlign="center" sx={{ mb: 8 }}>
          Galerie
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            columnGap: { xs: 4, md: 5 },
            rowGap: { xs: 2, md: 3 },
            maxWidth: 750,
            mx: 'auto',
          }}
        >
          {techniques.map(({ value, label }) => (
            <Box
              key={value}
              component={Link}
              to={`/galerie?technique=${value}`}
              sx={{ textDecoration: 'none' }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '100%',
                  overflow: 'hidden',
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: '#000',
                  backgroundImage: techniqueImages[value]
                    ? `url('${techniqueImages[value]}')`
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  '&:hover .overlay': { opacity: 1 },
                }}
              >
                <Box
                  className="overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              </Box>
              <Typography
                variant="subtitle1"
                textAlign="center"
                sx={{ mt: 1.5, color: 'text.primary', fontWeight: 500 }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Actualites */}
      {newsItems.length > 0 && (
        <Box sx={{ py: 10, px: { xs: 4, md: 8, lg: 12 }, bgcolor: 'background.default' }}>
          <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Typography
              variant="h3"
              component="h2"
              fontWeight={700}
              textAlign="center"
              sx={{ mb: 6 }}
            >
              Actualit&#233;s
            </Typography>
            <Box>
              {newsItems.map((item, i) => (
                <NewsItem key={i} item={item} />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Biographie */}
      <Box sx={{ py: 10, px: { xs: 4, md: 8, lg: 12 }, bgcolor: 'background.default' }}>
        <Typography variant="h3" component="h2" fontWeight={700} textAlign="center" sx={{ mb: 8 }}>
          Biographie
        </Typography>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          {biographyImageUrl ? (
            <Box
              component="img"
              src={biographyImageUrl}
              alt="Portrait"
              sx={{
                float: 'left',
                width: { xs: '100%', md: 200 },
                aspectRatio: '1',
                borderRadius: 1,
                mr: { md: 4 },
                mb: { xs: 3, md: 2 },
                mt: '0.4em',
                objectFit: 'cover',
                shapeOutside: 'margin-box',
              }}
            />
          ) : (
            <Box
              sx={{
                float: 'left',
                width: { xs: '100%', md: 200 },
                aspectRatio: '1',
                bgcolor: '#000',
                borderRadius: 1,
                mr: { md: 4 },
                mb: { xs: 3, md: 2 },
                mt: '0.4em',
                shapeOutside: 'margin-box',
              }}
            />
          )}
          <Typography
            component="div"
            variant="body1"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.8,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            {biographyText}
          </Typography>
        </Box>
      </Box>

      {/* Presse */}
      <Box sx={{ py: 10, px: { xs: 4, md: 8, lg: 12 }, bgcolor: 'background.default' }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Typography
            variant="h3"
            component="h2"
            fontWeight={700}
            textAlign="center"
            sx={{ mb: 8 }}
          >
            Presse
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {pressItems.map((item, i) => (
              <PressCard key={i} item={item} />
            ))}
          </Box>
          <Box sx={{ mt: 5, textAlign: 'center' }}>
            <Button
              component={Link}
              to="/presse"
              variant="outlined"
              endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: 0, px: 4, py: 1.2, letterSpacing: 1 }}
            >
              Voir toute la presse
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Contact */}
      <ContactSection config={config} />

      <ScrollToTop />
    </Box>
  );
}
