import { z } from 'zod';
import { TECHNIQUES, TECHNIQUES_WITH_SUPPORT } from './techniques.js';

export const artworkSchema = z
  .object({
    title: z.string().min(1).max(200),
    technique: z.enum(TECHNIQUES),
    height: z.number().positive(),
    width: z.number().positive(),
    support: z.enum(['canvas', 'paper']).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    comment: z.string().max(2000).optional(),
    imageUrl: z.string().url().optional(),
    additionalImages: z.array(z.string().url()).max(10).optional(),
  })
  .superRefine((artwork, ctx) => {
    if (TECHNIQUES_WITH_SUPPORT.includes(artwork.technique) && !artwork.support) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['support'],
        message: `support est requis pour la technique ${artwork.technique}`,
      });
    }
  });

export type ArtworkInput = z.infer<typeof artworkSchema>;
