export const techniques = [
  { value: 'mixed_canvas', label: 'Techniques mixtes sur toile' },
  { value: 'mixed_paper', label: 'Techniques mixtes sur papier' },
  { value: 'watercolor_pastel', label: 'Aquarelles et Pastels' },
  { value: 'drawing', label: 'Dessins et Croquis' },
  { value: 'illustration_edition', label: "Illustrations d'edition" },
  { value: 'illustration_poster', label: "Illustrations d'affiches" },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
export const apiUrl = (path) => `${API_BASE}${path}`;

function handleUnauthorized() {
  localStorage.removeItem('logged_in');
  window.location.href = '/admin/login';
}

export async function authFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée, veuillez vous reconnecter');
  }
  return res;
}

export async function uploadImage(
  file,
  folder = 'artworks',
  filename = `upload_${Date.now()}.jpg`,
) {
  const fd = new FormData();
  fd.append('image', file, filename);
  const res = await authFetch(apiUrl(`/admin/uploads?folder=${folder}`), {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Échec de l'upload");
  return data.url;
}

export async function saveSiteConfig(fields) {
  const res = await authFetch(apiUrl('/admin/site-config'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Sauvegarde échouée');
}

/** Beacon analytics first-party (aucun cookie, aucune donnée personnelle). */
export function trackPageView(path, artworkId) {
  try {
    if (path.startsWith('/admin')) return;
    const payload = JSON.stringify(artworkId ? { path, artworkId } : { path });
    const url = apiUrl('/track');
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* le tracking ne doit jamais casser la navigation */
  }
}
