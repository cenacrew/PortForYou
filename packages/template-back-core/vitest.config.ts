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
      // 2026-07-19 : Stmts 49.41 / Branch 39.94 / Funcs 47.29 / Lines 50.95.
      // Objectif : empêcher toute régression sans casser la CI actuelle.
      thresholds: {
        statements: 47,
        branches: 37,
        functions: 45,
        lines: 48,
      },
    },
  },
});
