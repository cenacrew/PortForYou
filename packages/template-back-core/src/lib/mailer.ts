/**
 * Envoi d'emails : Resend en production (RESEND_API_KEY), sinon driver fake
 * qui logge dans la console — le dev local fonctionne sans aucun compte.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
const MAIL_FROM = process.env.MAIL_FROM || 'Port’ForYou <onboarding@resend.dev>';

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendMail({ to, subject, text, replyTo }: SendMailInput) {
  if (!RESEND_API_KEY) {
    console.log(
      `📧 [mailer:fake] to=${to} subject="${subject}" replyTo=${replyTo || '-'}\n${text}`,
    );
    return { ok: true, driver: 'fake' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [to],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend a répondu ${res.status}: ${body}`);
  }
  return { ok: true, driver: 'resend' };
}
