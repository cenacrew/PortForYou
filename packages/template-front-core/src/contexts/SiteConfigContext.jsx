import { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils';

const SiteConfigContext = createContext(null);

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    fetch(apiUrl('/site-config'))
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({}));
  }, []);
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
