import { describe, expect, it } from 'vitest';
import { getMobileShellNavTargets } from '@/components/mobile-nav';
import { getTabletShellNavTargets } from '@/components/tablet-sidebar';
import { getRoutePolicy } from '@/lib/route-policy';

describe('shell navigation integrity', () => {
  it('retargets tablet navigation to existing management routes', () => {
    expect(getTabletShellNavTargets()).toEqual(['/', '/tokens', '/tasks', '/reviews', '/settings']);
  });

  it('keeps mobile navigation within declared route policy', () => {
    expect(getMobileShellNavTargets()).toEqual([
      '/',
      '/identities',
      '/spaces',
      '/tokens',
      '/tasks',
      '/reviews',
      '/settings',
    ]);

    for (const href of getMobileShellNavTargets().filter((path) => path !== '/')) {
      expect(getRoutePolicy(href)).toBeDefined();
    }
  });
});
