import { describe, it, expect, vi } from 'vitest';

const collectionSpy = vi.fn();
const docSpy = vi.fn();

vi.mock('../lib/firebaseAdmin.js', () => {
  const subCollection = { id: 'sub' };
  const doc = { collection: docSpy.mockReturnValue(subCollection) };
  return {
    db: { collection: collectionSpy.mockReturnValue({ doc: vi.fn(() => doc) }) },
    storage: null,
    storageBucketName: null,
  };
});

const { TENANT_ID, artworksCol, storagePath, demoGuard } = await import('../lib/tenant.js');

describe('lib/tenant', () => {
  it('utilise "dev" comme tenant par défaut', () => {
    expect(TENANT_ID).toBe('dev');
  });

  it('préfixe les collections par tenants/{TENANT_ID}', () => {
    artworksCol();
    expect(collectionSpy).toHaveBeenCalledWith('tenants');
    expect(docSpy).toHaveBeenCalledWith('artworks');
  });

  it('préfixe les chemins Storage par tenants/{TENANT_ID}/uploads', () => {
    expect(storagePath('artworks/a.jpg')).toBe(`tenants/${TENANT_ID}/uploads/artworks/a.jpg`);
  });

  it('demoGuard laisse passer quand DEMO_MODE est inactif', () => {
    const next = vi.fn();
    demoGuard({ method: 'POST' }, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
