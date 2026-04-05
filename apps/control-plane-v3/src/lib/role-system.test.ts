import { describe, expect, it } from 'vitest';
import { getRequiredRoleForPath } from './role-system';

describe('role-system', () => {
  it('treats tasks as an admin-only route because the page depends on admin APIs', () => {
    expect(getRequiredRoleForPath('/tasks')).toBe('admin');
  });

  it('keeps spaces readable for viewer sessions while page actions can degrade by role', () => {
    expect(getRequiredRoleForPath('/spaces')).toBe('viewer');
  });
});
