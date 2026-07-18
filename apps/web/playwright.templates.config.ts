import { defineConfig, devices } from '@playwright/test';

/**
 * Suite QA des 3 templates (accessibilité axe + régression visuelle).
 *
 * Les 3 templates partagent le même back — leur seule valeur différenciante est
 * la direction artistique. Cette suite la protège : captures de référence au
 * pixel près et audit axe des violations sérieuses sur les pages clés (accueil,
 * galerie, page œuvre).
 *
 * Volontairement séparée de `playwright.config.ts` (flow démo de la vitrine) :
 * ici on ne sert que les fronts Vite des templates, sans émulateurs ni API. Les
 * appels `/api` échouent et les pages retombent sur leur contenu placeholder —
 * ce qui rend justement les captures déterministes (aucune donnée dynamique).
 *
 * ⚠️ Les captures de référence sont dépendantes de l'OS (rendu des polices).
 * Celles commitées sont générées sous Windows (suffixe `-win32`). Sur un autre
 * OS (CI Linux), régénérer avec :
 *   pnpm --filter @portforyou/web test:e2e:templates -- --update-snapshots
 */

const TEMPLATES = [
  { name: 'atelier', port: 4001 },
  { name: 'monolith', port: 4002 },
  { name: 'papier', port: 4003 },
] as const;

export default defineConfig({
  testDir: './e2e-templates',
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      // Rendu des polices non déterministe d'un OS à l'autre : petite tolérance.
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    trace: 'retain-on-failure',
    locale: 'fr-FR',
    // Viewport fixe = captures reproductibles.
    viewport: { width: 1280, height: 800 },
  },
  projects: TEMPLATES.map((t) => ({
    name: t.name,
    use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${t.port}` },
  })),
  webServer: TEMPLATES.map((t) => ({
    command: `pnpm --filter @portforyou/${t.name}-front dev -- --port ${t.port} --strictPort`,
    url: `http://localhost:${t.port}`,
    cwd: '../..',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  })),
});
