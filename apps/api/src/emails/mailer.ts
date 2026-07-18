import { config } from '../config.js';
import { emailLogsCol } from '../lib/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

interface MailInput {
  to: string;
  subject: string;
  text: string;
  type: string;
}

/** Resend en prod, log console en dev. Chaque envoi est journalisé dans email_logs. */
export async function sendMail({ to, subject, text, type }: MailInput): Promise<void> {
  let status = 'sent';
  let driver = 'fake';
  try {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [mailer:fake] to=${to} type=${type} subject="${subject}"\n${text}`);
    } else {
      driver = 'resend';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.MAIL_FROM || "Port'ForYou <onboarding@resend.dev>",
          to: [to],
          subject,
          text,
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    status = 'failed';
    console.error('Envoi email échoué', { type, to }, err);
  }
  await emailLogsCol()
    .add({ to, subject, type, driver, status, createdAt: FieldValue.serverTimestamp() })
    .catch(() => {});
}

export function verificationEmail(displayName: string, link: string) {
  return {
    subject: 'Confirmez votre adresse email — Port’ForYou',
    text:
      `Bonjour ${displayName},\n\n` +
      `Pour confirmer votre adresse email, ouvrez ce lien (valable 24 h) :\n${link}\n\n` +
      `Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.\n\n` +
      `L'équipe Port'ForYou`,
  };
}

export function orderConfirmationEmail(artistName: string, siteSlug: string) {
  return {
    subject: 'Votre commande Port’ForYou est confirmée 🎨',
    text:
      `Bonjour ${artistName},\n\n` +
      `Votre commande est confirmée : le déploiement de votre portfolio « ${siteSlug} » démarre.\n` +
      `Suivez sa progression en temps réel depuis votre dashboard.\n\n` +
      `À très vite,\nL'équipe Port'ForYou`,
  };
}

export function siteLiveEmail(input: {
  artistName: string;
  frontUrl: string;
  adminEmail: string;
  adminPassword: string;
}) {
  return {
    subject: 'Votre portfolio est en ligne ! 🎉',
    text:
      `Bonjour ${input.artistName},\n\n` +
      `Votre portfolio est en ligne : ${input.frontUrl}\n\n` +
      `Accédez à votre back-office : ${input.frontUrl}/admin/login\n` +
      `Email : ${input.adminEmail}\n` +
      `Mot de passe : ${input.adminPassword}\n\n` +
      `⚠️ Ce mot de passe ne vous sera plus jamais renvoyé — conservez-le précieusement.\n` +
      `Vous pouvez le régénérer à tout moment depuis votre dashboard Port'ForYou.\n\n` +
      `Belle mise en ligne,\nL'équipe Port'ForYou`,
  };
}

export function quoteRequestEmail(input: {
  name: string;
  email: string;
  projectType?: string;
  budget?: string;
  message: string;
}) {
  return {
    subject: `Demande de devis — ${input.name}`,
    text:
      `Nouvelle demande de devis personnalisé via la vitrine Port'ForYou.\n\n` +
      `Nom : ${input.name}\n` +
      `Email : ${input.email}\n` +
      (input.projectType ? `Type de projet : ${input.projectType}\n` : '') +
      (input.budget ? `Budget indicatif : ${input.budget}\n` : '') +
      `\nMessage :\n${input.message}\n\n` +
      `— Répondez directement à ${input.email}`,
  };
}

export function deploymentFailedEmail(artistName: string, siteSlug: string) {
  return {
    subject: 'Un souci lors du déploiement de votre portfolio',
    text:
      `Bonjour ${artistName},\n\n` +
      `Le déploiement de « ${siteSlug} » a rencontré un problème. Nos équipes sont prévenues ` +
      `et vous recontacteront rapidement. Aucune action n'est nécessaire de votre côté.\n\n` +
      `L'équipe Port'ForYou`,
  };
}
