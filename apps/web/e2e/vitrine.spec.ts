import { test, expect } from '@playwright/test';

test.describe('Vitrine publique', () => {
  test('la page d’accueil affiche le hero et ses sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Votre art mérite');
    await expect(page.getByRole('heading', { name: 'Comment ça marche' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ils nous ont fait confiance' })).toBeVisible();
    await expect(page.getByText('Marcel Nino Pajot')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Les templates' })).toBeVisible();
    await expect(page.getByText('5 €', { exact: false }).first()).toBeVisible();
  });

  test('la collection liste les 3 templates et mène au détail', async ({ page }) => {
    await page.goto('/templates');
    for (const name of ['Atelier', 'Monolith', 'Papier']) {
      await expect(page.getByText(new RegExp(`${name}, 2026`))).toBeVisible();
    }
    await page.getByRole('link', { name: /Atelier, 2026/ }).click();
    await page.waitForURL('**/templates/atelier');
    await expect(page.getByRole('heading', { name: 'Atelier' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choisir cette template' })).toBeVisible();
  });

  test('les pages légales répondent', async ({ page }) => {
    for (const [path, heading] of [
      ['/mentions-legales', 'Mentions légales'],
      ['/cgv', 'Conditions générales de vente'],
      ['/confidentialite', 'Politique de confidentialité'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});

test.describe('Gardes d’authentification', () => {
  test('le dashboard redirige vers /login quand déconnecté', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login\?next=/);
    await expect(page.getByRole('heading', { name: 'Bon retour.' })).toBeVisible();
  });

  test('la commande exige une connexion', async ({ page }) => {
    await page.goto('/order');
    await page.waitForURL(/\/login\?next=/);
  });
});
