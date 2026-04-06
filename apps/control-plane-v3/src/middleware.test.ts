import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const initialManagementSessionCookieName = process.env.MANAGEMENT_SESSION_COOKIE_NAME;

function buildManagementSessionToken(role: 'viewer' | 'operator' | 'admin' | 'owner') {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      session_id: 'session-test',
      actor_id: 'human-test',
      email: 'owner@example.com',
      iat: 1,
      exp: 9999999999,
      ver: 1,
    })
  ).toString('base64url');
  const signature = 'signature';
  return `${payload}.${signature}`;
}

function buildRequest(pathname: string, token?: string, cookieName = 'management_session') {
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `${cookieName}=${token}`);
  }
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

describe('middleware', () => {
  afterEach(() => {
    if (initialManagementSessionCookieName === undefined) {
      delete process.env.MANAGEMENT_SESSION_COOKIE_NAME;
      return;
    }

    process.env.MANAGEMENT_SESSION_COOKIE_NAME = initialManagementSessionCookieName;
  });

  it('marks viewer as forbidden for admin routes when using a two-part management session token', () => {
    const token = buildManagementSessionToken('viewer');
    const response = middleware(buildRequest('/tokens', token));

    expect(response.headers.get('x-forbidden')).toBe('true');
    expect(response.headers.get('x-required-role')).toBe('admin');
    expect(response.headers.get('x-current-role')).toBe('viewer');
  });

  it('uses the shared route role policy for /tasks (admin required)', () => {
    const token = buildManagementSessionToken('operator');
    const response = middleware(buildRequest('/tasks', token));

    expect(response.headers.get('x-forbidden')).toBe('true');
    expect(response.headers.get('x-required-role')).toBe('admin');
    expect(response.headers.get('x-current-role')).toBe('operator');
  });

  it('honors a custom management session cookie name from env', () => {
    process.env.MANAGEMENT_SESSION_COOKIE_NAME = 'ops_session';

    const token = buildManagementSessionToken('viewer');
    const response = middleware(buildRequest('/tokens', token, 'ops_session'));

    expect(response.headers.get('x-forbidden')).toBe('true');
    expect(response.headers.get('x-required-role')).toBe('admin');
    expect(response.headers.get('x-current-role')).toBe('viewer');
  });
});
