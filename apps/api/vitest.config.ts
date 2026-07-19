import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
      // Seuils calés ~2-3 points sous la couverture réelle constatée avec
      // l'émulateur Firestore connecté (`test:coverage:emu`, seule mesure
      // représentative — sans émulateur les tests *.int.test.ts s'auto-
      // skippent et le chiffre est artificiellement bas) : Stmts 51.26 /
      // Branch 42.22 / Funcs 50.86 / Lines 52.16 le 2026-07-19. Objectif :
      // empêcher toute régression sans casser la CI actuelle.
      thresholds: {
        statements: 48,
        branches: 39,
        functions: 47,
        lines: 49,
      },
    },
  },
});
