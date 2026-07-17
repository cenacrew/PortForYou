/**
 * Constantes publiques de la vitrine, utilisées par la Metadata API de Next
 * (metadataBase, Open Graph, sitemap, robots). `NEXT_PUBLIC_SITE_URL` permet de
 * pointer un domaine personnalisé ; repli sur l'alias Hosting de la vitrine.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portforyou.web.app').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = "Port'ForYou";

export const SITE_DESCRIPTION =
  'Choisissez une template, un nom de site : votre portfolio professionnel est en ligne en ' +
  'quelques minutes, avec son back-office.';
