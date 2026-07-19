import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

export const LOCALE_STORAGE_KEY = 'pfy-locale';

const stored =
  typeof window !== 'undefined' ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null;

// Site tenant statique (Vite/SPA) : pas de rendu serveur, la langue est
// détectée côté client (localStorage, repli sur le français) — pas besoin
// d'un middleware ou d'un cookie comme côté apps/web (Next.js SSR).
i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: stored === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export default i18n;
