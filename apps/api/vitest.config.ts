import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
      // Seuils calés ~2-3 points sous la couverture réelle constatée en local
      // sans émulateur (les tests *.int.test.ts s'auto-skippent sans Firestore
      // émulé, d'où des chiffres bas) : Stmts 5.19 / Branch 5.91 / Funcs 3.17 /
      // Lines 5.61 le 2026-07-17. Objectif : empêcher toute régression sans
      // casser la CI actuelle. À relever une fois l'émulateur intégré à la CI.
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 3,
        lines: 5,
      },
    },
  },
});
