/**
 * Seed du contenu placeholder d'un tenant.
 * Usage : TENANT_ID=<slug> node seed.js
 * En local, pointer l'émulateur : FIRESTORE_EMULATOR_HOST=localhost:8090
 * Idempotent : ne fait rien si le tenant a déjà des œuvres (sauf --force).
 */
import { db } from './src/lib/firebaseAdmin.js';
import { TENANT_ID, artworksCol, siteConfigDoc } from './src/lib/tenant.js';
import { FieldValue } from 'firebase-admin/firestore';

const TECHNIQUES = [
  'mixed_canvas',
  'mixed_paper',
  'watercolor_pastel',
  'drawing',
  'illustration_edition',
  'illustration_poster',
];

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

async function main() {
  if (!db) {
    console.error('Firestore non configuré (credentials ou FIRESTORE_EMULATOR_HOST manquants).');
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  const existing = await artworksCol().limit(1).get();
  if (!existing.empty && !force) {
    console.log(
      `Tenant "${TENANT_ID}" déjà seedé — rien à faire (utilisez --force pour re-seeder).`,
    );
    return;
  }

  console.log(`Seed du tenant "${TENANT_ID}"…`);

  await siteConfigDoc().set(
    {
      heroImageUrl: '/placeholder-hero.svg',
      biographyImageUrl: '/placeholder-portrait.svg',
      biographyText:
        'Née de la rencontre entre matière et lumière, ma pratique explore les paysages ' +
        "intérieurs. Formé·e aux Beaux-Arts, j'expose depuis une quinzaine d'années en " +
        "France et à l'étranger. Chaque série est une tentative de saisir ce qui se " +
        'dérobe : le passage du temps, la mémoire des lieux, la présence des absents.\n\n' +
        '— Ce texte est un exemple, personnalisez-le depuis votre back-office.',
      newsItems: [
        {
          title: 'Exposition personnelle — Galerie du Passage',
          date: '2026-09-12',
          text: 'Vernissage le 12 septembre à 18h. Exposition jusqu’au 30 octobre. (Exemple)',
        },
        {
          title: 'Nouvelle série en cours',
          date: '2026-06-01',
          text: 'Une nouvelle série de travaux sur papier rejoindra bientôt la galerie. (Exemple)',
        },
      ],
      pressItems: [
        {
          title: '« Une œuvre entre ombre et lumière »',
          source: 'Revue des Arts (exemple)',
          date: '2026-03-15',
          excerpt: 'Un travail remarquable de justesse et de profondeur…',
        },
        {
          title: 'Portrait d’atelier',
          source: 'Le Journal (exemple)',
          date: '2025-11-02',
          excerpt: 'Rencontre avec un·e artiste dont la pratique ne cesse de se réinventer.',
        },
      ],
      contactEmail: 'artiste@example.com',
      socialInstagram: '',
      socialFacebook: '',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const batch = db.batch();
  TITLES.forEach((title, i) => {
    const technique = TECHNIQUES[i % TECHNIQUES.length];
    const num = String(i + 1).padStart(2, '0');
    const ref = artworksCol().doc();
    batch.set(ref, {
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

  console.log(`✅ Tenant "${TENANT_ID}" seedé : site_config + ${TITLES.length} œuvres.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
