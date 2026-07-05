/**
 * Donne le rôle admin Port'ForYou à un compte (auth maison : champ `role`
 * du document users). L'utilisateur doit se reconnecter pour que son
 * access token porte le nouveau rôle.
 *
 * Usage : pnpm --filter @portforyou/api set-admin -- user@example.com
 * Local : FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/api set-admin -- user@example.com
 */
import { db, usersCol } from '../src/lib/firebase.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage : set-admin <email>');
  process.exit(1);
}

const pointer = await db.collection('user_emails').doc(email.toLowerCase()).get();
const uid = pointer.data()?.uid as string | undefined;
if (!uid) {
  console.error(`Aucun compte pour ${email} — l'utilisateur doit d'abord s'inscrire.`);
  process.exit(1);
}

await usersCol().doc(uid).update({ role: 'admin' });
console.log(`✅ ${email} (${uid}) est maintenant admin. Reconnexion requise.`);
process.exit(0);
