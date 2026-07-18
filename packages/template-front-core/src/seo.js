/**
 * SEO runtime pour un front SPA statique (build identique pour tous les tenants).
 * Le contenu par-tenant n'existe qu'au runtime via l'API `/site-config` : on met
 * donc à jour le <head> côté client (title, meta description, Open Graph,
 * Twitter Card, JSON-LD, canonical) une fois la config chargée.
 *
 * Limite connue : les crawlers qui n'exécutent pas de JS ne voient que les
 * balises par défaut de index.html. Googlebot (rendu JS) et la plupart des
 * moteurs modernes voient les balises injectées ici ; certains scrapers sociaux
 * plus anciens non — d'où des valeurs par défaut correctes dans index.html.
 */

import { techniques } from './utils';

const SITE_FALLBACK = 'Portfolio d’artiste';

function absUrl(url) {
  if (!url) return '';
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function truncate(text, max = 160) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function upsertMeta(attr, key, content) {
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === '') {
    if (existing) existing.remove();
    return;
  }
  const el = existing || document.createElement('meta');
  if (!existing) {
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(items) {
  document.head.querySelectorAll('script[data-managed="seo"]').forEach((s) => s.remove());
  (items || []).filter(Boolean).forEach((obj) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.managed = 'seo';
    script.textContent = JSON.stringify(obj);
    document.head.appendChild(script);
  });
}

/** Applique un jeu complet de balises SEO au <head>. */
export function applyHead({
  title,
  description,
  siteName,
  image,
  url,
  type = 'website',
  jsonLd = [],
}) {
  if (title) document.title = title;
  const img = absUrl(image);
  const canonical = absUrl(url || window.location.pathname);

  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', siteName);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:image', img);
  upsertMeta('name', 'twitter:card', img ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', img);
  upsertCanonical(canonical);
  setJsonLd(jsonLd);
}

/** JSON-LD Person décrivant l'artiste, injecté sur toutes les pages « site ». */
function personJsonLd(config, siteName) {
  const sameAs = [config?.socialInstagram, config?.socialFacebook].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteName,
    url: window.location.origin,
    ...(config?.biographyText ? { description: truncate(config.biographyText, 300) } : {}),
    ...(config?.biographyImageUrl ? { image: absUrl(config.biographyImageUrl) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

const PAGE_META = {
  '/': (name) => ({ title: `${name} — Artiste`, suffix: false }),
  '/galerie': (name) => ({ title: `Galerie — ${name}` }),
  '/biographie': (name) => ({ title: `Biographie — ${name}` }),
  '/presse': (name) => ({ title: `Presse — ${name}` }),
  '/contact': (name) => ({ title: `Contact — ${name}` }),
};

const PAGE_DESCRIPTION = {
  '/galerie': (name) => `Découvrez les œuvres de ${name}, classées par technique.`,
  '/biographie': (name) => `Biographie et parcours de ${name}.`,
  '/presse': (name) => `Revue de presse et articles consacrés à ${name}.`,
  '/contact': (name) => `Contactez ${name} pour toute demande ou renseignement.`,
};

/** Construit les balises SEO d'une page « site » standard depuis la config du tenant. */
export function buildPageSeo(pathname, config) {
  const siteName = config?.siteName || SITE_FALLBACK;
  const page = PAGE_META[pathname]?.(siteName) || { title: siteName };

  const defaultDescription =
    config?.siteDescription ||
    (config?.biographyText ? truncate(config.biographyText) : `Portfolio de ${siteName}.`);
  const description = truncate(PAGE_DESCRIPTION[pathname]?.(siteName) || defaultDescription);

  return {
    title: page.title,
    description,
    siteName,
    image: config?.heroImageUrl,
    url: pathname,
    type: pathname === '/' ? 'website' : 'article',
    jsonLd: [personJsonLd(config, siteName)],
  };
}

/** Construit les balises SEO d'une fiche œuvre (page /galerie/:id). */
export function buildArtworkSeo(item, config) {
  const siteName = config?.siteName || SITE_FALLBACK;
  const techniqueLabel =
    techniques.find((t) => t.value === item?.technique)?.label || item?.technique || '';
  const title = `${item?.title || 'Œuvre'} — ${siteName}`;
  const parts = [techniqueLabel, item?.year ? String(item.year) : ''].filter(Boolean).join(', ');
  const description = truncate(
    item?.comment || (parts ? `${item?.title || 'Œuvre'} — ${parts}.` : `Œuvre de ${siteName}.`),
  );

  const artwork = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: item?.title || 'Œuvre',
    ...(item?.imageUrl ? { image: absUrl(item.imageUrl) } : {}),
    ...(techniqueLabel ? { artMedium: techniqueLabel } : {}),
    ...(item?.year ? { dateCreated: String(item.year) } : {}),
    creator: { '@type': 'Person', name: siteName },
    ...(item?.width
      ? { width: { '@type': 'QuantitativeValue', value: item.width, unitCode: 'CMT' } }
      : {}),
    ...(item?.height
      ? { height: { '@type': 'QuantitativeValue', value: item.height, unitCode: 'CMT' } }
      : {}),
  };

  return {
    title,
    description,
    siteName,
    image: item?.imageUrl || config?.heroImageUrl,
    url: window.location.pathname,
    type: 'article',
    jsonLd: [artwork],
  };
}
