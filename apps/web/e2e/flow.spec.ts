import { test, expect } from '@playwright/test';
import { uniqueUser, signup } from './helpers';

/**
 * LE test de la démo : inscription → commande (template, slug, identité,
 * récapitulatif) → paiement simulé → suivi du déploiement en temps réel
 * → site live sur le dashboard.
 */
test('flow démo complet : de l’inscription au site en ligne', async ({ page }) => {
  const user = uniqueUser();

  // 1. Inscription (Auth émulateur) → dashboard vide
  await signup(page, user);
  await expect(page.getByText('Votre premier portfolio vous attend.')).toBeVisible();

  // 2. Funnel de commande — étape template
  await page.getByRole('link', { name: 'Créer mon portfolio' }).click();
  await page.waitForURL('**/order');
  await expect(page.getByRole('heading', { name: 'Choisissez votre template' })).toBeVisible();
  await page.getByRole('button', { name: /Atelier/ }).click();
  await page.getByRole('button', { name: 'Continuer →' }).click();

  // 3. Étape slug — vérification de disponibilité en direct
  await expect(page.getByRole('heading', { name: 'Nommez votre site' })).toBeVisible();
  await page.getByLabel(/Nom du site/).fill(user.slug);
  await expect(page.getByText('✓ Ce nom est disponible')).toBeVisible();
  await expect(page.getByText(`pfy-${user.slug}.web.app`)).toBeVisible();
  await page.getByRole('button', { name: 'Continuer →' }).click();

  // 4. Étape identité — pré-remplie depuis le compte
  await expect(page.getByLabel(/Nom affiché/)).toHaveValue(user.name);
  await expect(page.getByLabel(/Email de contact/)).toHaveValue(user.email);
  await page.getByRole('button', { name: 'Continuer →' }).click();

  // 5. Récapitulatif → paiement simulé
  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await page.getByRole('button', { name: 'Procéder au paiement' }).click();
  await page.waitForURL('**/order/fake-checkout**');
  await expect(page.getByText('Paiement de démonstration')).toBeVisible();
  await page.getByRole('button', { name: 'Payer 6,60 €' }).click();

  // 6. Suivi temps réel du déploiement (timeline onSnapshot)
  await page.waitForURL('**/dashboard/sites/**');
  await expect(page.getByText('Déploiement en cours')).toBeVisible();
  await expect(page.getByText('Validation de la commande')).toBeVisible();
  await expect(page.getByText('Mise en ligne de votre site')).toBeVisible();

  // 7. Le provisioning fake aboutit : site en ligne
  await expect(page.getByRole('link', { name: 'Visiter mon site →' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('En ligne', { exact: true })).toBeVisible();

  // 8. Le dashboard liste le site en ligne
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: /En ligne/ })).toBeVisible();
  await expect(page.getByText(user.name).first()).toBeVisible();

  // 9. Le même slug n'est plus disponible pour une nouvelle commande
  await page.goto('/order');
  await page.getByRole('button', { name: 'Continuer →' }).click();
  await page.getByLabel(/Nom du site/).fill(user.slug);
  await expect(page.getByText('Ce nom est déjà pris')).toBeVisible();
});

test('profil : la suppression de compte est protégée par confirmation', async ({ page }) => {
  const user = uniqueUser();
  await signup(page, user);

  await page.goto('/dashboard/profile');
  await expect(page.getByText(user.email)).toBeVisible();

  const deleteButton = page.getByRole('button', { name: /Supprimer définitivement/ });
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel(/Tapez « SUPPRIMER »/).fill('SUPPRIMER');
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  // Compte supprimé → retour à l'accueil, déconnecté
  await page.waitForURL('**/?compte-supprime=1');
  await expect(page.getByRole('link', { name: 'Connexion' })).toBeVisible();
});
