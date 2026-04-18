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

  it('does not hardcode authenticated users on auth routes back to the admin hub', () => {
    expect(isRouteAllowed('/login', 'authenticated')).toEqual({
      allowed: false,
      reason: '已认证',
    });
  });

  it('blocks anonymous access to approvals', () => {
    expect(getRoutePolicy('/approvals')).toBeDefined();
    expect(isRouteAllowed('/approvals', 'anonymous')).toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'Authentication required for /approvals',
    });
  });

  it('blocks anonymous access to playbooks', () => {
    expect(getRoutePolicy('/playbooks')).toBeDefined();
    expect(isRouteAllowed('/playbooks', 'anonymous')).toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'Authentication required for /playbooks',
    });
  });

  it('blocks anonymous access to runs', () => {
    expect(getRoutePolicy('/runs')).toBeDefined();
    expect(isRouteAllowed('/runs', 'anonymous')).toEqual({
      allowed: false,
      redirect: '/login',
      reason: 'Authentication required for /runs',
    });
  });
});
