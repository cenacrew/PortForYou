import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
      // Seuils calés ~2-3 points sous la couverture réelle constatée le
      // 2026-07-17 : Stmts 41.98 / Branch 33.95 / Funcs 32.43 / Lines 43.43.
      // Objectif : empêcher toute régression sans casser la CI actuelle.
      thresholds: {
        statements: 39,
        branches: 31,
        functions: 30,
        lines: 41,
      },
    },
  },
});
