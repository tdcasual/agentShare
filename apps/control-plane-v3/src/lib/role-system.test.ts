import { describe, expect, it } from 'vitest';
import { getDefaultManagementRoute, getRequiredRoleForPath } from './role-system';

describe('role-system', () => {
  it('treats tasks as an admin-only route because the page depends on admin APIs', () => {
    expect(getRequiredRoleForPath('/tasks')).toBe('admin');
  });

  it('keeps spaces readable for viewer sessions while page actions can degrade by role', () => {
    expect(getRequiredRoleForPath('/spaces')).toBe('viewer');
  });

  it('routes viewer and operator sessions to the first allowed management page', () => {
    expect(getDefaultManagementRoute('viewer')).toBe('/playbooks');
    expect(getDefaultManagementRoute('operator')).toBe('/reviews');
  });

  it('keeps admin and owner sessions on the management hub', () => {
    expect(getDefaultManagementRoute('admin')).toBe('/');
    expect(getDefaultManagementRoute('owner')).toBe('/');
  });
});
