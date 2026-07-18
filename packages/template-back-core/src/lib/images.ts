import sharp from 'sharp';

/**
 * Optimisation des images à l'upload.
 *
 * Les œuvres uploadées par les artistes sortent souvent d'un appareil photo
 * (JPEG de plusieurs Mo). Servir ces originaux tels quels aux visiteurs coûte
 * cher en temps de chargement, en egress GCS et en score Lighthouse. On génère
 * donc à l'upload des variantes WebP redimensionnées (vignette, galerie, plein
 * écran) qui remplacent l'original raster côté stockage tenant.
 */

export interface ImageVariantSpec {
  /** Nom logique de la variante (sert aussi de nom de fichier : `<name>.webp`). */
  name: string;
  /** Largeur cible maximale en pixels. La hauteur suit le ratio d'origine. */
  width: number;
}

/** Vignette (grilles), galerie (affichage courant), plein écran (vue détail). */
export const IMAGE_VARIANTS: readonly ImageVariantSpec[] = [
  { name: 'thumb', width: 400 },
  { name: 'gallery', width: 1200 },
  { name: 'full', width: 2000 },
];

/** Qualité WebP : bon compromis poids/rendu pour des reproductions d'œuvres. */
export const WEBP_QUALITY = 80;

/** Types MIME raster que l'on sait transformer en WebP. */
export const RASTER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface GeneratedVariant {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

/** Une image raster (JPEG/PNG/WebP) peut-elle être optimisée en variantes ? */
export function isOptimizableRaster(mimetype: string): boolean {
  return RASTER_MIME_TYPES.has(mimetype);
}

/**
 * Génère les variantes WebP redimensionnées d'une image.
 *
 * - respecte l'orientation EXIF (`rotate()`) ;
 * - n'agrandit jamais une image plus petite que la cible (`withoutEnlargement`) ;
 * - conserve le ratio (`fit: 'inside'`) ;
 * - `failOn: 'none'` : tolère les fichiers légèrement corrompus plutôt que de
 *   faire échouer tout l'upload.
 */
export async function generateWebpVariants(
  input: Buffer,
  specs: readonly ImageVariantSpec[] = IMAGE_VARIANTS,
): Promise<GeneratedVariant[]> {
  const variants: GeneratedVariant[] = [];
  for (const spec of specs) {
    const { data, info } = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: spec.width, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    variants.push({
      name: spec.name,
      buffer: data,
      width: info.width,
      height: info.height,
      contentType: 'image/webp',
    });
  }
  return variants;
}
