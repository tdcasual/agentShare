import { describe, expect, it } from 'vitest';
import { getErrorBoundaryHomeTarget } from '@/components/error-boundary';
import { getMobileShellNavTargets, shouldRenderMobileNavMoreButton } from '@/components/mobile-nav';
import { getTabletShellHomeTarget, getTabletShellNavTargets } from '@/components/tablet-sidebar';
import { getRoutePolicy } from '@/lib/route-policy';

describe('shell navigation integrity', () => {
  it('retargets tablet navigation to routes allowed for each role', () => {
    expect(getTabletShellNavTargets('viewer')).toEqual(['/playbooks', '/runs', '/spaces', '/docs']);
    expect(getTabletShellNavTargets('operator')).toEqual([
      '/reviews',
      '/approvals',
      '/marketplace',
      '/playbooks',
      '/runs',
      '/spaces',
      '/docs',
    ]);
    expect(getTabletShellNavTargets('admin')).toEqual([
      '/',
      '/inbox',
      '/reviews',
      '/approvals',
      '/marketplace',
      '/playbooks',
      '/runs',
      '/spaces',
      '/identities',
      '/assets',
      '/tokens',
      '/tasks',
      '/docs',
      '/settings',
    ]);
  });

  it('retargets the tablet shell home affordance to an allowed landing page', () => {
    expect(getTabletShellHomeTarget('viewer')).toBe('/playbooks');
    expect(getTabletShellHomeTarget('operator')).toBe('/reviews');
    expect(getTabletShellHomeTarget('admin')).toBe('/');
  });

  it('retargets error-boundary recovery to an allowed landing page', () => {
    expect(getErrorBoundaryHomeTarget('viewer')).toBe('/playbooks');
    expect(getErrorBoundaryHomeTarget('operator')).toBe('/reviews');
    expect(getErrorBoundaryHomeTarget('admin')).toBe('/');
  });

  it('keeps mobile navigation within declared route policy for each role', () => {
    expect(getMobileShellNavTargets('viewer')).toEqual(['/playbooks', '/runs', '/spaces', '/docs']);
    expect(getMobileShellNavTargets('operator')).toEqual([
      '/reviews',
      '/approvals',
      '/marketplace',
      '/playbooks',
      '/runs',
      '/spaces',
      '/docs',
    ]);
    expect(getMobileShellNavTargets('admin')).toEqual([
      '/',
      '/inbox',
      '/reviews',
      '/approvals',
      '/marketplace',
      '/playbooks',
      '/runs',
      '/spaces',
      '/identities',
      '/assets',
      '/tokens',
      '/tasks',
      '/docs',
    ]);

    for (const href of getMobileShellNavTargets('admin').filter((path) => path !== '/')) {
      expect(getRoutePolicy(href)).toBeDefined();
    }
  });

  it('only shows the mobile More affordance when there is overflow navigation', () => {
    expect(shouldRenderMobileNavMoreButton('viewer')).toBe(false);
    expect(shouldRenderMobileNavMoreButton('operator')).toBe(true);
    expect(shouldRenderMobileNavMoreButton('admin')).toBe(true);
  });
});
