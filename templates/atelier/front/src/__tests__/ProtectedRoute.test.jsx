import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute, { isLoggedIn } from '../components/ProtectedRoute';

const ProtectedPage = () => <div>Page protégée</div>;
const LoginPage = () => <div>Page de connexion</div>;

const renderWithAuth = (loggedIn) => {
  localStorage.setItem('logged_in', loggedIn ? 'true' : 'false');
  return render(
    <MemoryRouter initialEntries={['/admin/back-office']}>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/back-office" element={<ProtectedPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  afterEach(() => localStorage.clear());

  it('redirige vers /admin/login si non connecté', () => {
    renderWithAuth(false);
    expect(screen.getByText('Page de connexion')).toBeDefined();
    expect(screen.queryByText('Page protégée')).toBeNull();
  });

  it('affiche le contenu protégé si connecté', () => {
    renderWithAuth(true);
    expect(screen.getByText('Page protégée')).toBeDefined();
    expect(screen.queryByText('Page de connexion')).toBeNull();
  });
});

describe('isLoggedIn', () => {
  afterEach(() => localStorage.clear());

  it('retourne false si rien dans localStorage', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('retourne true uniquement si la valeur est exactement "true"', () => {
    localStorage.setItem('logged_in', 'true');
    expect(isLoggedIn()).toBe(true);
  });

  it('retourne false pour une valeur différente de "true"', () => {
    localStorage.setItem('logged_in', '1');
    expect(isLoggedIn()).toBe(false);
    localStorage.setItem('logged_in', 'yes');
    expect(isLoggedIn()).toBe(false);
  });
});
