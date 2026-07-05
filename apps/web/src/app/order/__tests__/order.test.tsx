import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams('template=atelier'),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'alice@example.com', displayName: 'Alice Martin' },
    loading: false,
    isAdmin: false,
  }),
}));

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

const OrderPage = (await import('../page')).default;

beforeEach(() => {
  apiMock.mockReset();
  replace.mockReset();
});

describe('Funnel de commande', () => {
  it('déroule les 4 étapes jusqu’à la redirection paiement', async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation((path: string) => {
      if (String(path).startsWith('/slugs/check')) {
        return Promise.resolve({ slug: 'atelier-alice', available: true });
      }
      if (path === '/orders') {
        return Promise.resolve({ orderId: 'o1', checkoutUrl: 'http://checkout.example/o1' });
      }
      return Promise.resolve({});
    });

    render(<OrderPage />);

    // Étape 1 : template pré-sélectionnée via l'URL, les 3 templates listées
    expect(screen.getByText('Choisissez votre template')).toBeInTheDocument();
    expect(screen.getByText('Atelier')).toBeInTheDocument();
    expect(screen.getByText('Monolith')).toBeInTheDocument();
    expect(screen.getByText('Papier')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer →' }));

    // Étape 2 : slug vérifié en temps réel (debounce)
    expect(screen.getByText('Nommez votre site')).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: 'Continuer →' });
    expect(continueBtn).toBeDisabled();
    await user.type(screen.getByLabelText(/Nom du site/), 'atelier-alice');
    await waitFor(() => expect(screen.getByText('✓ Ce nom est disponible')).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(apiMock).toHaveBeenCalledWith('/slugs/check?slug=atelier-alice');
    await user.click(screen.getByRole('button', { name: 'Continuer →' }));

    // Étape 3 : identité pré-remplie depuis le compte
    expect(screen.getByLabelText(/Nom affiché/)).toHaveValue('Alice Martin');
    expect(screen.getByLabelText(/Email de contact/)).toHaveValue('alice@example.com');
    await user.click(screen.getByRole('button', { name: 'Continuer →' }));

    // Étape 4 : récapitulatif puis création de la commande
    expect(screen.getByText('Récapitulatif')).toBeInTheDocument();
    expect(screen.getByText('pfy-atelier-alice.web.app')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Procéder au paiement' }));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith('/orders', expect.objectContaining({ method: 'POST' })),
    );
    const body = JSON.parse(
      (apiMock.mock.calls.find((call) => call[0] === '/orders')![1] as { body: string }).body,
    );
    expect(body).toEqual({
      templateSlug: 'atelier',
      siteSlug: 'atelier-alice',
      artistName: 'Alice Martin',
      contactEmail: 'alice@example.com',
    });
  });

  it('bloque l’étape slug quand le nom est pris', async () => {
    const user = userEvent.setup();
    apiMock.mockResolvedValue({ available: false, reason: 'Ce nom est déjà pris' });

    render(<OrderPage />);
    await user.click(screen.getByRole('button', { name: 'Continuer →' }));
    await user.type(screen.getByLabelText(/Nom du site/), 'deja-pris');

    await waitFor(() => expect(screen.getByText('Ce nom est déjà pris')).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByRole('button', { name: 'Continuer →' })).toBeDisabled();
  });
});
