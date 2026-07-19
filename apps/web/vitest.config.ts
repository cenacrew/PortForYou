import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // `include` compte tout src/ (pages, composants) même les fichiers
      // jamais importés par un test, pour un pourcentage honnête plutôt que
      // mesuré sur la seule petite tranche déjà couverte (l'option `all`
      // équivalente a été retirée de Vitest 4 : ce comportement est
      // désormais implicite dès qu'`include` est précisé).
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
      // Seuils calés ~2-3 points sous la couverture réelle constatée le
      // 2026-07-19 : Stmts 12.86 / Branch 25.47 / Funcs 7.76 / Lines 12.42.
      // Objectif : empêcher toute régression sans casser la CI actuelle.
      thresholds: {
        statements: 10,
        branches: 22,
        functions: 5,
        lines: 10,
      },
    },
  },
});
