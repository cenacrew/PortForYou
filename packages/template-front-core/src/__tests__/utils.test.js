import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiUrl, uploadImage, saveSiteConfig } from '../utils';

describe('apiUrl', () => {
  it('ajoute le chemin au base URL', () => {
    expect(apiUrl('/artworks')).toMatch(/\/artworks$/);
  });

  it('concatène correctement un chemin imbriqué', () => {
    expect(apiUrl('/auth/login')).toMatch(/\/auth\/login$/);
  });
});

describe('uploadImage', () => {
  afterEach(() => vi.restoreAllMocks());

  it("retourne l'URL publique en cas de succès", async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://storage.googleapis.com/bucket/artworks/test.jpg' }),
    });
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    const url = await uploadImage(file, 'artworks', 'test.jpg');
    expect(url).toBe('https://storage.googleapis.com/bucket/artworks/test.jpg');
  });

  it('envoie le fichier dans un FormData vers /admin/uploads', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://storage.googleapis.com/bucket/artworks/test.jpg' }),
    });
    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
    await uploadImage(file, 'site', 'hero.jpg');
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('/admin/uploads');
    expect(url).toContain('folder=site');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('include');
  });

  it('lève une erreur avec le message serveur si !ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Type de fichier non supporté' }),
    });
    const file = new File(['data'], 'test.bmp', { type: 'image/bmp' });
    await expect(uploadImage(file)).rejects.toThrow('Type de fichier non supporté');
  });
});

describe('saveSiteConfig', () => {
  afterEach(() => vi.restoreAllMocks());

  it('envoie un PUT avec les champs en JSON', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    await saveSiteConfig({ contactEmail: 'artiste@example.com' });
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.method).toBe('PUT');
    expect(opts.credentials).toBe('include');
    expect(JSON.parse(opts.body)).toEqual({ contactEmail: 'artiste@example.com' });
  });

  it('lève une erreur si le serveur répond !ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Non autorisé' }),
    });
    await expect(saveSiteConfig({})).rejects.toThrow('Non autorisé');
  });
});
