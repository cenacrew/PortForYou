'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

// Access token en mémoire uniquement (posé par le contexte d'auth).
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

/**
 * Appelle l'API plateforme avec l'access token ; en cas de 401, tente un
 * refresh (cookie httpOnly) puis rejoue la requête une fois.
 */
export async function api<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API_URL}/api/v1${path}`, { ...init, headers, credentials: 'include' });
  };

  let res = await doFetch();

  // 401 : tente une restauration de session via le cookie refresh (même si
  // aucun access token n'était encore posé — cas d'une navigation fraîche).
  if (res.status === 401) {
    const refresh = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refresh.ok) {
      const data = (await refresh.json()) as { accessToken: string };
      accessToken = data.accessToken;
      res = await doFetch();
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
  }
  return body as T;
}
