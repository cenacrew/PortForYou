import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SiteConfigProvider, useSiteConfig } from '../contexts/SiteConfigContext';

const Consumer = () => {
  const config = useSiteConfig();
  if (config === null) return <div>Chargement</div>;
  return <div>Email: {config.contactEmail || 'vide'}</div>;
};

describe('SiteConfigContext', () => {
  afterEach(() => vi.restoreAllMocks());

  it('retourne null pendant le chargement', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    render(
      <SiteConfigProvider>
        <Consumer />
      </SiteConfigProvider>,
    );
    expect(screen.getByText('Chargement')).toBeDefined();
  });

  it('fournit la config après fetch réussi', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ contactEmail: 'artiste@example.com' }),
    });
    render(
      <SiteConfigProvider>
        <Consumer />
      </SiteConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('Email: artiste@example.com')).toBeDefined());
  });

  it("fournit un objet vide en cas d'erreur réseau", async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('réseau indisponible'));
    render(
      <SiteConfigProvider>
        <Consumer />
      </SiteConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('Email: vide')).toBeDefined());
  });

  it('fournit un objet vide si la réponse JSON est invalide', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => {
        throw new Error('JSON invalide');
      },
    });
    render(
      <SiteConfigProvider>
        <Consumer />
      </SiteConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('Email: vide')).toBeDefined());
  });
});
