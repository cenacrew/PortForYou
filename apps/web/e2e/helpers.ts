import { randomInt } from 'node:crypto';
import type { Page } from '@playwright/test';

/** Identifiants uniques par run pour ne pas dépendre de l'état de l'émulateur. */
export function uniqueUser() {
  const stamp = `${Date.now()}${randomInt(1000)}`;
  return {
    name: 'Alice Testeuse',
    email: `alice-${stamp}@e2e.test`,
    password: 'motdepasse-e2e',
    slug: `e2e-${stamp}`,
  };
}

/** Crée un compte via la page signup (Auth émulateur). */
export async function signup(page: Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto('/signup');
  await page.getByLabel('Nom').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mot de passe').fill(user.password);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL('**/dashboard');
}
