import { FieldValue } from 'firebase-admin/firestore';
import { tenantDoc } from '../lib/firebase.js';
import { TECHNIQUES } from '@portforyou/shared';

const TITLES = [
  'Sans titre I',
  'Rivage',
  'Le seuil',
  'Nocturne',
  'Fragments',
  'La traversée',
  'Étude nº 4',
  'Silhouette',
  'Jardin intérieur',
  'Échos',
  'Le passage',
  'Aube',
];

/**
 * Seed du contenu placeholder d'un nouveau tenant (étape « database » du
 * provisioning). Idempotent : ne re-seed pas un tenant qui a déjà des œuvres.
 */
export async function seedTenant(slug: string, artistName: string, contactEmail: string) {
  const root = tenantDoc(slug);
  const artworks = root.collection('artworks');

  const existing = await artworks.limit(1).get();
  if (!existing.empty) return;

  await root
    .collection('site_config')
    .doc('main')
    .set(
      {
        siteName: artistName,
        siteDescription: `Portfolio de ${artistName} — œuvres, biographie, actualités et presse.`,
        heroImageUrl: '/placeholder-hero.svg',
        biographyImageUrl: '/placeholder-portrait.svg',
        biographyText:
          `Bienvenue sur le portfolio de ${artistName}.\n\n` +
          'Née de la rencontre entre matière et lumière, ma pratique explore les paysages ' +
          'intérieurs. Chaque série est une tentative de saisir ce qui se dérobe : le passage ' +
          'du temps, la mémoire des lieux, la présence des absents.\n\n' +
          '— Ce texte est un exemple, personnalisez-le depuis votre back-office.',
        newsItems: [
          {
            title: 'Votre première actualité',
            date: new Date().toISOString().slice(0, 10),
            text: 'Annoncez ici vos expositions et événements. (Exemple à personnaliser)',
          },
        ],
        pressItems: [
          {
            title: '« Une œuvre entre ombre et lumière »',
            source: 'Revue des Arts (exemple)',
            date: '2026-03-15',
            excerpt: 'Un travail remarquable de justesse et de profondeur…',
          },
        ],
        contactEmail,
        socialInstagram: '',
        socialFacebook: '',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  const batch = root.firestore.batch();
  TITLES.forEach((title, i) => {
    const technique = TECHNIQUES[i % TECHNIQUES.length]!;
    const num = String(i + 1).padStart(2, '0');
    batch.set(artworks.doc(), {
      title,
      technique,
      ...(technique === 'mixed_canvas' || technique === 'mixed_paper'
        ? { support: technique === 'mixed_canvas' ? 'canvas' : 'paper' }
        : {}),
      height: 50 + (i % 4) * 15,
      width: 40 + (i % 3) * 20,
      year: 2020 + (i % 6),
      comment: '',
      imageUrl: `/placeholders/artwork-${num}.svg`,
      additionalImages: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}
