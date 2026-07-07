import { describe, it, expect } from 'vitest';
import { validateNewsItems } from '../lib/validateNewsItems.js';

describe('validateNewsItems', () => {
  it('accepte un tableau vide', () => {
    expect(validateNewsItems([])).toBeNull();
  });

  it('accepte un item valide minimal', () => {
    expect(validateNewsItems([{ title: 'Exposition', date: '2025-06-01' }])).toBeNull();
  });

  it('accepte un item avec tous les champs optionnels', () => {
    expect(
      validateNewsItems([
        {
          title: 'Exposition',
          date: '2025-06-01',
          endDate: '2025-06-15',
          link: 'https://example.com',
        },
      ]),
    ).toBeNull();
  });

  it("rejette si ce n'est pas un tableau", () => {
    expect(validateNewsItems(null)).toBeTruthy();
    expect(validateNewsItems({})).toBeTruthy();
    expect(validateNewsItems('string')).toBeTruthy();
  });

  it('rejette si title est manquant', () => {
    expect(validateNewsItems([{ date: '2025-06-01' }])).toBeTruthy();
  });

  it('rejette si title est vide', () => {
    expect(validateNewsItems([{ title: '   ', date: '2025-06-01' }])).toBeTruthy();
  });

  it('rejette si date est manquante', () => {
    expect(validateNewsItems([{ title: 'Expo' }])).toBeTruthy();
  });

  it('rejette si date est au mauvais format', () => {
    expect(validateNewsItems([{ title: 'Expo', date: '01/06/2025' }])).toBeTruthy();
    expect(validateNewsItems([{ title: 'Expo', date: '2025/06/01' }])).toBeTruthy();
    expect(validateNewsItems([{ title: 'Expo', date: 'demain' }])).toBeTruthy();
  });

  it('rejette si endDate est au mauvais format', () => {
    expect(
      validateNewsItems([{ title: 'Expo', date: '2025-06-01', endDate: '01/06/2025' }]),
    ).toBeTruthy();
  });

  it("rejette si link n'est pas une URL http(s)", () => {
    expect(
      validateNewsItems([{ title: 'Expo', date: '2025-06-01', link: 'www.example.com' }]),
    ).toBeTruthy();
    expect(
      validateNewsItems([{ title: 'Expo', date: '2025-06-01', link: 'ftp://example.com' }]),
    ).toBeTruthy();
  });

  it('accepte un link https valide', () => {
    expect(
      validateNewsItems([{ title: 'Expo', date: '2025-06-01', link: 'https://example.com/page' }]),
    ).toBeNull();
  });

  it("valide chaque item du tableau — s'arrête au premier invalide", () => {
    const items = [
      { title: 'Expo 1', date: '2025-06-01' },
      { title: '', date: '2025-07-01' },
    ];
    expect(validateNewsItems(items)).toBeTruthy();
  });
});
