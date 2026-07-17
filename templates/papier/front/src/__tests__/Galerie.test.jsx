import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Galerie from '../pages/Galerie';

vi.mock('../components/ArtworkList', () => ({
  default: ({ items }) => (
    <ul>
      {items.map((i) => (
        <li key={i.id}>{i.title}</li>
      ))}
    </ul>
  ),
}));

const mockFetch = (payload, ok = true) => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    json: async () => payload,
  });
};

const renderGalerie = () =>
  render(
    <MemoryRouter>
      <Galerie />
    </MemoryRouter>,
  );

describe('Galerie', () => {
  afterEach(() => vi.restoreAllMocks());

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

    // L'apparition du texte (commit React) et l'exécution de l'effect qui
    // instancie IntersectionObserver (passive effect, flush asynchrone) ne
    // sont pas garanties dans le même tick : attendre explicitement que le
    // constructeur mocké ait été appelé évite d'invoquer observerCallback
    // avant qu'il ne soit assigné (source du flake "observerCallback is not
    // a function").
    await waitFor(() => expect(observerCallback).toEqual(expect.any(Function)));

    // Simuler l'entrée dans le viewport du sentinel
    observerCallback([{ isIntersecting: true }]);
    await waitFor(() => expect(screen.getByText('Peinture 2')).toBeDefined());
    expect(screen.getByText('Peinture 1')).toBeDefined();

    vi.unstubAllGlobals();
  });
});
