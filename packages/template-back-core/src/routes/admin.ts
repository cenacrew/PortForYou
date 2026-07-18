import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db, storage, storageBucketName } from '../lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import multer from 'multer';
import { validateNewsItems } from '../lib/validateNewsItems.js';
import { artworksCol, siteConfigDoc, storagePath, demoGuard } from '../lib/tenant.js';
import { generateWebpVariants, isOptimizableRaster } from '../lib/images.js';
import crypto from 'node:crypto';

const router: Router = Router();
router.use(demoGuard);
// Uploads mono-image : on borne explicitement la taille (10 Mo) ET le nombre de
// fichiers (1) pour limiter la surface d'un envoi malveillant.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const TECHNIQUE_ALLOWED = [
  'mixed_canvas',
  'mixed_paper',
  'watercolor_pastel',
  'drawing',
  'illustration_edition',
  'illustration_poster',
];

const ALLOWED_FOLDERS: string[] = ['artworks', 'site'];

// POST /api/v1/admin/uploads
router.post('/uploads', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!storage || !storageBucketName) {
      return res.status(500).json({ error: 'Storage non configuré' });
    }
    const file = req.file;
    if (!file)
      return res.status(400).json({ error: "Aucun fichier reçu. Utilisez le champ 'image'" });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Type de fichier non supporté' });
    }

    const folderParam = typeof req.query.folder === 'string' ? req.query.folder : undefined;
    const folder = folderParam && ALLOWED_FOLDERS.includes(folderParam) ? folderParam : 'artworks';

    const bucket = storage.bucket(storageBucketName);
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    const publicUrlFor = (path: string) =>
      emulatorHost
        ? `http://${emulatorHost}/v0/b/${storageBucketName}/o/${encodeURIComponent(path)}?alt=media`
        : `https://storage.googleapis.com/${storageBucketName}/${path}`;

    const saveToBucket = async (path: string, buffer: Buffer, contentType: string) => {
      await bucket.file(path).save(buffer, {
        contentType,
        public: true,
        metadata: { contentType },
      });
    };

    // Images raster (JPEG/PNG/WebP) : on remplace l'original par des variantes
    // WebP redimensionnées (vignette/galerie/plein écran) — gain en chargement,
    // en egress GCS et en score Lighthouse. Les GIF (potentiellement animés) et
    // tout échec sharp retombent sur un stockage à l'identique de l'original.
    if (isOptimizableRaster(file.mimetype)) {
      try {
        const id = crypto.randomUUID();
        const variants = await generateWebpVariants(file.buffer);
        const urls: Record<string, string> = {};
        let primaryPath = '';
        for (const variant of variants) {
          const path = storagePath(`${folder}/${id}/${variant.name}.webp`);
          await saveToBucket(path, variant.buffer, variant.contentType);
          urls[variant.name] = publicUrlFor(path);
          if (variant.name === 'full') primaryPath = path;
        }
        // `url` = plein écran (meilleure fidélité) pour rester compatible avec le
        // stockage d'une seule `imageUrl` côté œuvre ; `variants` expose les
        // tailles intermédiaires pour un usage plus fin côté front.
        return res.status(201).json({
          url: urls.full,
          path: primaryPath,
          contentType: 'image/webp',
          variants: urls,
        });
      } catch (err) {
        console.error('WebP variant generation failed, storing original:', err);
      }
    }

    const ext = (file.originalname.match(/\.\w{1,8}$/)?.[0] || '').toLowerCase();
    const filePath = storagePath(`${folder}/${crypto.randomUUID()}${ext}`);
    await saveToBucket(filePath, file.buffer, file.mimetype);
    return res.status(201).json({
      url: publicUrlFor(filePath),
      path: filePath,
      contentType: file.mimetype,
    });
  } catch (err) {
    console.error('Upload failed:', err);
    return res.status(500).json({ error: "Échec de l'upload" });
  }
});

// POST /api/v1/admin/artworks
router.post('/artworks', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore non configuré' });

    const { title, technique, height, width, year, comment, imageUrl } = req.body || {};
    if (!title || !technique || !imageUrl) {
      return res
        .status(400)
        .json({ error: 'Champs requis manquants (title, technique, imageUrl)' });
    }
    if (!TECHNIQUE_ALLOWED.includes(technique)) {
      return res.status(400).json({ error: 'Valeur de technique invalide' });
    }

    const docData = {
      title: String(title).trim(),
      technique,
      height: height != null && height !== '' ? Number(height) : null,
      width: width != null && width !== '' ? Number(width) : null,
      year: year ? Number(year) : null,
      comment: comment ? String(comment) : '',
      imageUrl: String(imageUrl),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await artworksCol().add(docData);
    return res.status(201).json({ id: ref.id, ...docData });
  } catch (err) {
    console.error('Failed to create artwork:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

// PUT /api/v1/admin/artworks/:id
router.put('/artworks/:id', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore non configuré' });

    const id = String(req.params.id);
    const { title, technique, height, width, year, comment, imageUrl, additionalImages } =
      req.body || {};
    if (!title || !technique) {
      return res.status(400).json({ error: 'Champs requis manquants (title, technique)' });
    }
    if (!TECHNIQUE_ALLOWED.includes(technique)) {
      return res.status(400).json({ error: 'Valeur de technique invalide' });
    }

    const docData = {
      title: String(title).trim(),
      technique,
      height: height != null && height !== '' ? Number(height) : null,
      width: width != null && width !== '' ? Number(width) : null,
      year: year ? Number(year) : null,
      comment: comment ? String(comment) : '',
      imageUrl: imageUrl ? String(imageUrl) : '',
      additionalImages: Array.isArray(additionalImages) ? additionalImages.filter(Boolean) : [],
      updatedAt: FieldValue.serverTimestamp(),
    };

    await artworksCol().doc(id).update(docData);
    return res.status(200).json({ id, ...docData });
  } catch (err) {
    console.error('Failed to update artwork:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

// PUT /api/v1/admin/site-config
router.put('/site-config', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore non configuré' });

    const allowed = [
      'siteName',
      'siteDescription',
      'heroImageUrl',
      'techniqueImages',
      'biographyImageUrl',
      'biographyText',
      'pressItems',
      'newsItems',
      'contactEmail',
      'socialInstagram',
      'socialFacebook',
      'bgColor',
      'contentColor',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' });
    }
    if (update.newsItems !== undefined) {
      const err = validateNewsItems(update.newsItems);
      if (err) return res.status(400).json({ error: err });
    }

    update.updatedAt = FieldValue.serverTimestamp();
    await siteConfigDoc().set(update, { merge: true });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to update site config:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

// DELETE /api/v1/admin/artworks/:id
router.delete('/artworks/:id', authMiddleware, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore non configuré' });
    const id = String(req.params.id);
    await artworksCol().doc(id).delete();
    return res.status(200).json({ id });
  } catch (err) {
    console.error('Failed to delete artwork:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
