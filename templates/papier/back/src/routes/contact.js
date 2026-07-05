import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebaseAdmin.js';
import { contactMessagesCol, siteConfigDoc } from '../lib/tenant.js';
import { sendMail } from '../lib/mailer.js';

const router = Router();

/**
 * POST /api/v1/contact — formulaire de contact public.
 * Body : { name, email, message, website } — `website` est un honeypot :
 * rempli = bot, on répond ok sans rien faire.
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message, website } = req.body || {};

    if (website) return res.status(200).json({ ok: true }); // honeypot

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 120 ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 200 ||
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 5000
    ) {
      return res.status(400).json({ error: 'Nom, email valide et message sont requis.' });
    }

    if (!db) return res.status(500).json({ error: 'Service indisponible' });

    await contactMessagesCol().add({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    const config = (await siteConfigDoc().get()).data() || {};
    const to = config.contactEmail || process.env.ADMIN_EMAIL;
    if (to) {
      await sendMail({
        to,
        replyTo: email.trim(),
        subject: `Nouveau message de ${name.trim()} via votre portfolio`,
        text: `Nom : ${name.trim()}\nEmail : ${email.trim()}\n\n${message.trim()}`,
      }).catch((err) => console.error('Envoi email contact échoué:', err.message));
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact failed:', err);
    return res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
