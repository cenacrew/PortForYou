import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Package non servi (pas d'app Vite) : cette config sert uniquement à vitest
// pour exécuter les tests du code partagé des templates.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
