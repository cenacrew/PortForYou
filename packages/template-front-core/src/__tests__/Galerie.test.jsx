import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import Galerie from '../pages/Galerie';
import { DesignSystemProvider } from '../design-system/DesignSystemContext';

// Stub de la DA (ArtworkList est injecté par le template, pas présent dans le core).
const StubArtworkList = ({ items }) => (
  <ul>
    {items.map((i) => (
      <li key={i.id}>{i.title}</li>
    ))}
  </ul>
);

const mockFetch = (payload, ok = true) => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    json: async () => payload,
  });
};

const renderGalerie = () =>
  render(
    <DesignSystemProvider components={{ ArtworkList: StubArtworkList }}>
      <MemoryRouter>
        <Galerie />
      </MemoryRouter>
    </DesignSystemProvider>,
  );

describe('Galerie', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Dans afterEach plutôt qu'en fin de test : un échec ne doit pas laisser
    // fuiter le stub d'IntersectionObserver sur les tests suivants.
    vi.unstubAllGlobals();
  });

  it('affiche le spinner pendant le chargement', () => {
    mockFetch({ items: [], nextCursor: null });
    renderGalerie();
    expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it('affiche les œuvres après chargement', async () => {
    mockFetch({
      items: [
        { id: '1', title: 'Peinture 1' },
        { id: '2', title: 'Croquis 2' },
      ],
      nextCursor: null,
    });
    renderGalerie();
    await waitFor(() => expect(screen.getByText('Peinture 1')).toBeDefined());
    expect(screen.getByText('Croquis 2')).toBeDefined();
  });

  it('affiche "Aucune oeuvre" si la liste est vide', async () => {
    mockFetch({ items: [], nextCursor: null });
    renderGalerie();
    await waitFor(() => expect(screen.getByText(/aucune oeuvre/i)).toBeDefined());
  });

  it("affiche l'erreur si le fetch échoue", async () => {
    mockFetch({ error: 'Erreur serveur' }, false);
    renderGalerie();
    await waitFor(() => expect(screen.getByText('Erreur serveur')).toBeDefined());
  });

  it("n'affiche pas de spinner initial si nextCursor est null", async () => {
    mockFetch({ items: [{ id: '1', title: 'Peinture 1' }], nextCursor: null });
    renderGalerie();
    await waitFor(() => screen.getByText('Peinture 1'));
    expect(screen.queryByText(/chargement/i)).toBeNull();
  });

  it('charge la page suivante via IntersectionObserver et accumule les items', async () => {
    let observerCallback;
    const observeSpy = vi.fn();
    const unobserveSpy = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function (cb) {
        observerCallback = cb;
        return { observe: observeSpy, unobserve: unobserveSpy };
      }),
    );

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: '1', title: 'Peinture 1' }], nextCursor: 'c1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: '2', title: 'Peinture 2' }], nextCursor: null }),
      });

    renderGalerie();
    await waitFor(() => screen.getByText('Peinture 1'));

    // L'effet qui construit l'IntersectionObserver sort en `return` anticipé
    // tant que `hasMore` est faux : il ne s'exécute donc qu'après le premier
    // fetch. Attendre l'affichage de « Peinture 1 » ne garantit pas que cet
    // effet a déjà tourné — d'où un `observerCallback` parfois encore undefined
    // (flaky historique). On attend l'observation effective du sentinel, qui a
    // lieu juste après la construction de l'observer : le callback est alors
    // forcément capturé.
    await waitFor(() => expect(observeSpy).toHaveBeenCalled());

    // Simuler l'entrée dans le viewport du sentinel
    observerCallback([{ isIntersecting: true }]);
    await waitFor(() => expect(screen.getByText('Peinture 2')).toBeDefined());
    expect(screen.getByText('Peinture 1')).toBeDefined();
  });
});
