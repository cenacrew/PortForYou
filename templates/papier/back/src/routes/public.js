import { Router } from 'express';
import { db } from '../lib/firebaseAdmin.js';
import { artworksCol, siteConfigDoc } from '../lib/tenant.js';

const router = Router();
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

router.get('/artworks', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore not configured on server' });

    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const startAfter = req.query.startAfter || null;

    let query = artworksCol().orderBy('createdAt', 'desc').limit(limit);
    if (startAfter) {
      const cursorDoc = await artworksCol().doc(startAfter).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor =
      snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ items, nextCursor });
  } catch (err) {
    console.error('Failed to list artworks:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/artworks/detail/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore not configured' });
    const doc = await artworksCol().doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Failed to get artwork:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/artworks/:technique', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore not configured on server' });
    const { technique } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const startAfter = req.query.startAfter || null;

    let query = artworksCol()
      .where('technique', '==', technique)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      const cursorDoc = await artworksCol().doc(startAfter).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor =
      snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ items, nextCursor });
  } catch (err) {
    console.error('Failed to list artworks by technique:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/site-config', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firestore not configured' });
    const doc = await siteConfigDoc().get();
    const data = doc.exists ? doc.data() : {};
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch (err) {
    console.error('Failed to get site config:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
