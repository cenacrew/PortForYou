import { createContext, useContext } from 'react';

/**
 * Injection de la direction artistique (DA) dans le code partagé.
 *
 * Les composants qui portent l'identité visuelle d'un template (aujourd'hui
 * `ArtworkList`, qui embarque `Artwork`) vivent dans chaque template (dossier
 * `templates/<slug>/front`) et sont fournis au code partagé via ce contexte,
 * initialisé dans l'`index.jsx` de chaque template. Le code partagé
 * (`template-front-core`) reste ainsi identique pour les trois templates ;
 * seule la DA change.
 */
const DesignSystemContext = createContext(null);

export function DesignSystemProvider({ components, children }) {
  return <DesignSystemContext.Provider value={components}>{children}</DesignSystemContext.Provider>;
}

export function useDesignSystem() {
  const ctx = useContext(DesignSystemContext);
  if (!ctx) {
    throw new Error('useDesignSystem doit être utilisé dans un <DesignSystemProvider>.');
  }
  return ctx;
}
