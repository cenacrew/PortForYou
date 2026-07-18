export interface TemplateMeta {
  slug: string;
  name: string;
  year: string;
  medium: string;
  tagline: string;
  description: string;
  features: string[];
  image: string;
  available: boolean;
  demoUrl: string | null;
}

/** Catalogue affiché par la vitrine (les visuels vivent dans /public). */
export const TEMPLATES: TemplateMeta[] = [
  {
    slug: 'atelier',
    name: 'Atelier',
    year: '2026',
    medium: 'Galerie classique, lumière naturelle',
    tagline: 'Élégante et intemporelle — celle qui a tout commencé.',
    description:
      "La template originelle de Port'ForYou, éprouvée en production par un artiste peintre. " +
      'Galerie classée par technique, biographie, presse, actualités, contact — et un ' +
      'back-office complet pour tout gérer sans une ligne de code.',
    features: [
      'Galerie par technique (6 catégories)',
      'Back-office complet : œuvres, textes, images',
      'Pages biographie, presse, actualités',
      'Formulaire de contact avec envoi d’email',
      'Statistiques de visites intégrées',
    ],
    image: '/templates/atelier.svg',
    available: true,
    demoUrl: 'https://pfy-demo-atelier.web.app',
  },
  {
    slug: 'monolith',
    name: 'Monolith',
    year: '2026',
    medium: 'Encre profonde, typographie monumentale',
    tagline: 'Sombre, immersive, monumentale.',
    description:
      'Œuvres plein écran sur fond noir, navigation immersive, typographie massive. ' +
      'Pour les illustrateurs et photographes à l’univers graphique affirmé.',
    features: [
      'Mêmes fonctionnalités que Atelier',
      'Galerie plein écran immersive',
      'Direction artistique sombre et contrastée',
    ],
    image: '/templates/monolith.svg',
    available: true,
    demoUrl: 'https://pfy-demo-monolith.web.app',
  },
  {
    slug: 'papier',
    name: 'Papier',
    year: '2026',
    medium: 'Grain de papier, cartels délicats',
    tagline: 'Claire, éditoriale, délicate.',
    description:
      'Grille masonry aérée, cartels façon musée, ambiance papier et atelier. ' +
      'Pour les aquarellistes, dessinateurs et pastellistes.',
    features: [
      'Mêmes fonctionnalités que Atelier',
      'Grille masonry et cartels de musée',
      'Direction artistique claire et éditoriale',
    ],
    image: '/templates/papier.svg',
    available: true,
    demoUrl: 'https://pfy-demo-papier.web.app',
  },
];

export const getTemplate = (slug: string) => TEMPLATES.find((t) => t.slug === slug);
