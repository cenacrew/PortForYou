import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Package non servi (pas d'app Vite) : cette config sert uniquement à vitest
// pour exécuter les tests du code partagé des templates.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // `include` compte aussi les fichiers jamais importés par un test (ex.
      // composants back-office non couverts) — sans ça, le % ne reflète que
      // la petite tranche de code déjà testée, pas tout `src/` (l'option
      // `all` équivalente a été retirée de Vitest 4 : ce comportement est
      // désormais implicite dès qu'`include` est précisé).
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/__tests__/**'],
      // Seuils calés ~2-3 points sous la couverture réelle constatée le
      // 2026-07-19 (compte tout `src/`, y compris les fichiers back-office
      // jamais importés par un test) : Stmts 23.7 /
      // Branch 16.69 / Funcs 14.93 / Lines 25.25. Objectif : empêcher toute
      // régression sans casser la CI actuelle.
      thresholds: {
        statements: 21,
        branches: 14,
        functions: 12,
        lines: 23,
      },
    },
  },
});
