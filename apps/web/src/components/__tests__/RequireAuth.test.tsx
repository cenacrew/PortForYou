import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard',
}));

const authState = { user: null as unknown, loading: false, isAdmin: false };
vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}));

const { RequireAuth } = await import('../RequireAuth');

beforeEach(() => {
  replace.mockReset();
  authState.user = null;
  authState.loading = false;
  authState.isAdmin = false;
});

describe('RequireAuth', () => {
  it('redirige vers /login quand non connecté', () => {
    render(
      <RequireAuth>
        <p>contenu privé</p>
      </RequireAuth>,
    );
    expect(replace).toHaveBeenCalledWith('/login?next=%2Fdashboard');
    expect(screen.queryByText('contenu privé')).not.toBeInTheDocument();
  });

  it('affiche les enfants quand connecté', () => {
    authState.user = { uid: 'u1' };
    render(
      <RequireAuth>
        <p>contenu privé</p>
      </RequireAuth>,
    );
    expect(screen.getByText('contenu privé')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renvoie un non-admin vers /dashboard sur les pages admin', () => {
    authState.user = { uid: 'u1' };
    render(
      <RequireAuth admin>
        <p>zone admin</p>
      </RequireAuth>,
    );
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('zone admin')).not.toBeInTheDocument();
  });

  it("n'affiche rien pendant le chargement de l'auth", () => {
    authState.loading = true;
    render(
      <RequireAuth>
        <p>contenu privé</p>
      </RequireAuth>,
    );
    expect(screen.queryByText('contenu privé')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
