import { describe, it, expect } from 'vitest';
import {
  siteTransition,
  canTransition,
  assertSiteStatus,
  InvalidSiteTransitionError,
  INITIAL_SITE_STATUS,
  SITE_EVENTS,
  type SiteEvent,
} from '../siteState.js';
import { SITE_STATUSES, type SiteStatus } from '../platform.js';

describe('machine à états sites.status', () => {
  it('démarre en provisioning', () => {
    expect(INITIAL_SITE_STATUS).toBe('provisioning');
  });

  it.each([
    ['provisioning', 'provision_succeeded', 'live'],
    ['provisioning', 'provision_failed', 'error'],
    ['provisioning', 'suspend', 'suspended'],
    ['provisioning', 'redeploy', 'provisioning'],
    ['error', 'retry', 'provisioning'],
    ['error', 'redeploy', 'provisioning'],
    ['error', 'suspend', 'suspended'],
    ['live', 'redeploy', 'provisioning'],
    ['live', 'suspend', 'suspended'],
    ['suspended', 'redeploy', 'provisioning'],
    ['suspended', 'suspend', 'suspended'],
  ] as [SiteStatus, SiteEvent, SiteStatus][])(
    'transition légale %s --%s--> %s',
    (from, event, expected) => {
      expect(siteTransition(from, event)).toBe(expected);
      expect(canTransition(from, event)).toBe(true);
    },
  );

  it.each([
    // Un retry sur un site sain doit être rejeté.
    ['live', 'retry'],
    ['provisioning', 'retry'],
    ['suspended', 'retry'],
    // Un live ne peut pas « re-réussir » ou repasser en erreur sans redéploiement.
    ['live', 'provision_succeeded'],
    ['live', 'provision_failed'],
    // Une réussite/erreur ne peut venir que de provisioning.
    ['error', 'provision_succeeded'],
    ['suspended', 'provision_failed'],
  ] as [SiteStatus, SiteEvent][])('transition illégale %s --%s--> rejetée', (from, event) => {
    expect(() => siteTransition(from, event)).toThrow(InvalidSiteTransitionError);
    expect(canTransition(from, event)).toBe(false);
  });

  it('couvre tous les statuts et événements déclarés', () => {
    expect(SITE_STATUSES).toContain('provisioning');
    expect(SITE_EVENTS).toContain('retry');
  });

  it('assertSiteStatus valide et rejette', () => {
    expect(assertSiteStatus('live')).toBe('live');
    expect(() => assertSiteStatus('zombie')).toThrow();
    expect(() => assertSiteStatus(undefined)).toThrow();
  });
});
