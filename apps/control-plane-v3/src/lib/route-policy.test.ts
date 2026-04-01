import { describe, expect, it } from 'vitest';
import { getRoutePolicy, isRouteAllowed } from './route-policy';

describe('route-policy', () => {
  it('keeps the demo hub readable without authentication', () => {
    expect(getRoutePolicy('/demo')?.mode).toBe('demo');
    expect(isRouteAllowed('/demo', 'anonymous')).toEqual({ allowed: true });
  });

  it('blocks anonymous access to identities', () => {
    expect(isRouteAllowed('/identities', 'anonymous')).toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'Authentication required for /identities',
    });
  });

  it('blocks anonymous access to spaces', () => {
    expect(isRouteAllowed('/spaces', 'anonymous')).toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'Authentication required for /spaces',
    });
  });

  it('keeps demo identity routes readable without authentication', () => {
    expect(getRoutePolicy('/demo/identities')?.mode).toBe('demo');
    expect(isRouteAllowed('/demo/identities', 'anonymous')).toEqual({ allowed: true });
  });

  it('guards marketplace as an authenticated management surface', () => {
    expect(getRoutePolicy('/marketplace')?.mode).toBe('authenticated');
    expect(isRouteAllowed('/marketplace', 'authenticated')).toEqual({
      allowed: true,
    });
  });
});
