import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { applyHead, buildPageSeo } from '../seo';

/**
 * Met à jour le <head> (title, meta, Open Graph, JSON-LD) à chaque changement de
 * page « site », une fois la config du tenant chargée. Les fiches œuvres
 * (/galerie/:id) gèrent leur propre SEO dans ArtworkInfo (elles connaissent
 * l'œuvre), et l'espace d'administration est ignoré (noindex par défaut).
 */
export default function Seo() {
  const location = useLocation();
  const config = useSiteConfig();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return;
    if (/^\/galerie\/.+/.test(path)) return; // géré par ArtworkInfo
    applyHead(buildPageSeo(path, config || {}));
  }, [location.pathname, config]);

  return null;
}
