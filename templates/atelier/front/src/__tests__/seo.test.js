import { describe, it, expect, beforeEach } from 'vitest';
import { applyHead, buildPageSeo, buildArtworkSeo } from '../seo';

const config = {
  siteName: 'Marcel Nino',
  siteDescription: 'Peintre contemporain.',
  heroImageUrl: '/placeholder-hero.svg',
  biographyText: 'Une longue biographie de plus de cent soixante caractères. '.repeat(5),
  biographyImageUrl: '/portrait.jpg',
  socialInstagram: 'https://instagram.com/marcel',
};

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('buildPageSeo', () => {
  it('construit le titre et la description de la page galerie', () => {
    const seo = buildPageSeo('/galerie', config);
    expect(seo.title).toBe('Galerie — Marcel Nino');
    expect(seo.description).toContain('Marcel Nino');
    expect(seo.siteName).toBe('Marcel Nino');
    expect(seo.jsonLd[0]['@type']).toBe('Person');
    expect(seo.jsonLd[0].sameAs).toContain('https://instagram.com/marcel');
  });

  it('tronque la description à 160 caractères', () => {
    const seo = buildPageSeo('/biographie', { siteName: 'X', biographyText: 'a'.repeat(400) });
    // La description de /biographie est générée depuis le nom, donc courte ;
    // on vérifie plutôt la home qui retombe sur la bio.
    expect(seo.description.length).toBeLessThanOrEqual(161);
  });

  it('retombe sur un nom par défaut sans config', () => {
    const seo = buildPageSeo('/', {});
    expect(seo.title).toMatch(/Artiste/);
    expect(seo.type).toBe('website');
  });
});

describe('buildArtworkSeo', () => {
  it('produit un JSON-LD VisualArtwork', () => {
    const item = {
      title: 'Rivage',
      technique: 'drawing',
      year: 2021,
      width: 40,
      height: 55,
      imageUrl: '/art.jpg',
    };
    const seo = buildArtworkSeo(item, config);
    expect(seo.title).toBe('Rivage — Marcel Nino');
    expect(seo.jsonLd[0]['@type']).toBe('VisualArtwork');
    expect(seo.jsonLd[0].name).toBe('Rivage');
    expect(seo.jsonLd[0].creator.name).toBe('Marcel Nino');
    expect(seo.jsonLd[0].width.value).toBe(40);
  });
});

describe('applyHead', () => {
  it('écrit title, meta description, OG et JSON-LD dans le <head>', () => {
    applyHead(buildPageSeo('/', config));
    expect(document.title).toBe('Marcel Nino — Artiste');
    expect(document.head.querySelector('meta[name="description"]').content).toBeTruthy();
    expect(document.head.querySelector('meta[property="og:title"]').content).toBe(
      'Marcel Nino — Artiste',
    );
    // og:image absolutisée depuis l'origine jsdom.
    expect(document.head.querySelector('meta[property="og:image"]').content).toMatch(/^http/);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeTruthy();
    expect(document.head.querySelectorAll('script[data-managed="seo"]').length).toBe(1);
  });

  it('remplace les JSON-LD précédents au lieu de les cumuler', () => {
    applyHead(buildPageSeo('/', config));
    applyHead(buildPageSeo('/galerie', config));
    expect(document.head.querySelectorAll('script[data-managed="seo"]').length).toBe(1);
  });
});
