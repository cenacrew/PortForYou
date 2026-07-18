import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generateWebpVariants, isOptimizableRaster, IMAGE_VARIANTS } from '../lib/images.js';

/** Fabrique un PNG carré uni de la taille demandée pour nourrir sharp. */
async function makePng(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe('lib/images', () => {
  it('reconnaît les types raster optimisables et rejette le reste', () => {
    expect(isOptimizableRaster('image/jpeg')).toBe(true);
    expect(isOptimizableRaster('image/png')).toBe(true);
    expect(isOptimizableRaster('image/webp')).toBe(true);
    expect(isOptimizableRaster('image/gif')).toBe(false);
    expect(isOptimizableRaster('application/pdf')).toBe(false);
  });

  it('génère une variante WebP par spec, toutes en image/webp', async () => {
    const input = await makePng(3000);
    const variants = await generateWebpVariants(input);

    expect(variants).toHaveLength(IMAGE_VARIANTS.length);
    expect(variants.map((v) => v.name)).toEqual(['thumb', 'gallery', 'full']);
    for (const v of variants) {
      expect(v.contentType).toBe('image/webp');
      // En-tête de conteneur WebP : "RIFF"...."WEBP".
      expect(v.buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(v.buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
    }
  });

  it('redimensionne chaque variante à sa largeur cible en conservant le ratio', async () => {
    const input = await makePng(3000);
    const variants = await generateWebpVariants(input);
    const byName = Object.fromEntries(variants.map((v) => [v.name, v]));

    expect(byName.thumb.width).toBe(400);
    expect(byName.gallery.width).toBe(1200);
    expect(byName.full.width).toBe(2000);
    // Image source carrée → variantes carrées.
    for (const v of variants) expect(v.width).toBe(v.height);
  });

  it("n'agrandit jamais une image plus petite que la cible", async () => {
    const input = await makePng(300);
    const variants = await generateWebpVariants(input);
    for (const v of variants) {
      expect(v.width).toBe(300);
      expect(v.height).toBe(300);
    }
  });

  it('réduit significativement le poids par rapport à un PNG volumineux', async () => {
    const input = await makePng(3000);
    const variants = await generateWebpVariants(input);
    const full = variants.find((v) => v.name === 'full')!;
    // Le WebP redimensionné doit être nettement plus léger que le PNG 3000px.
    expect(full.buffer.length).toBeLessThan(input.length);
  });
});
