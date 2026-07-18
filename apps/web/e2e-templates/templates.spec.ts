import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA des templates : accessibilité (axe) + régression visuelle (screenshots).
 * Exécuté par `playwright.templates.config.ts` sur chacun des 3 templates
 * (projets atelier/monolith/papier), chacun avec son propre `baseURL`.
 */

/** Échoue si axe trouve des violations d'impact « serious » ou « critical ». */
async function expectNoSeriousA11yViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  const summary = serious
    .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nœud·s)`)
    .join('\n');

  expect(serious, `Violations a11y sérieuses sur ${context} :\n${summary}`).toEqual([]);
}

/**
 * Amorce le cache d'œuvres (sessionStorage) pour rendre la page œuvre
 * déterministe sans back : ArtworkInfo lit `artworks_cache` avant tout fetch.
 */
async function seedArtworkCache(page: Page) {
  await page.addInitScript(() => {
    const artwork = {
      id: 'demo-1',
      title: 'Composition',
      technique: 'drawing',
      height: 40,
      width: 30,
      year: 2021,
      comment: '',
    };
    try {
      window.sessionStorage.setItem('artworks_cache', JSON.stringify([artwork]));
    } catch {
      /* sessionStorage indisponible : la page retombera sur son état vide */
    }
  });
}

test.describe('Accueil', () => {
  test('accessibilité', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Galerie' }).first()).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'accueil');
  });

  test('régression visuelle', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Biographie' }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('home.png', { fullPage: true });
  });
});

test.describe('Galerie', () => {
  test('accessibilité', async ({ page }) => {
    await page.goto('/galerie');
    await expect(page.getByRole('heading', { name: 'Galerie' })).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'galerie');
  });

  test('régression visuelle', async ({ page }) => {
    await page.goto('/galerie');
    await expect(page.getByRole('heading', { name: 'Galerie' })).toBeVisible();
    await expect(page).toHaveScreenshot('gallery.png', { fullPage: true });
  });
});

test.describe('Page œuvre', () => {
  test('accessibilité', async ({ page }) => {
    await seedArtworkCache(page);
    await page.goto('/galerie/demo-1');
    await expect(page.getByRole('heading', { name: 'Composition' })).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'page œuvre');
  });

  test('régression visuelle', async ({ page }) => {
    await seedArtworkCache(page);
    await page.goto('/galerie/demo-1');
    await expect(page.getByRole('heading', { name: 'Composition' })).toBeVisible();
    await expect(page).toHaveScreenshot('artwork.png', { fullPage: true });
  });
});
