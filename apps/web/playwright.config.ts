import { defineConfig, devices } from '@playwright/test';

/**
 * E2E du flow démo complet contre la stack locale : émulateurs Firebase +
 * API (drivers fake) + vitrine. Les trois serveurs sont démarrés (ou
 * réutilisés s'ils tournent déjà) par Playwright.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // état Firestore partagé entre les tests
  workers: 1,
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'fr-FR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --dir ../.. emulators',
      url: 'http://localhost:4000',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @portforyou/api dev',
      cwd: '../..',
      url: 'http://localhost:8081/api/v1/health',
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        FIRESTORE_EMULATOR_HOST: 'localhost:8090',
        PROVISIONER_FAKE_DELAY_MS: '200',
        WEB_ORIGIN: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm --filter @portforyou/web dev',
      cwd: '../..',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:8081',
      },
    },
  ],
});
