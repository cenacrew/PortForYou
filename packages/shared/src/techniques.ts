export const TECHNIQUES = [
  'mixed_canvas',
  'mixed_paper',
  'watercolor_pastel',
  'drawing',
  'illustration_edition',
  'illustration_poster',
] as const;

export type Technique = (typeof TECHNIQUES)[number];

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  mixed_canvas: 'Technique mixte sur toile',
  mixed_paper: 'Technique mixte sur papier',
  watercolor_pastel: 'Aquarelle et pastel',
  drawing: 'Dessin',
  illustration_edition: 'Illustration — édition',
  illustration_poster: 'Illustration — affiche',
};

/** Techniques qui exigent le champ `support`. */
export const TECHNIQUES_WITH_SUPPORT: readonly Technique[] = ['mixed_canvas', 'mixed_paper'];
