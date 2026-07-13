import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const initialSessionCookieName = process.env.SESSION_COOKIE_NAME;

function buildManagementSessionToken(role: 'admin' = 'admin') {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      session_id: 'session-test',
      actor_id: 'human-test',
      email: 'admin@example.com',
      iat: 1,
      exp: 9999999999,
      ver: 1,
    })
  ).toString('base64url');
  const signature = 'signature';
  return `${payload}.${signature}`;
}

function buildRequest(pathname: string, token?: string, cookieName = 'vaultgate_session') {
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `${cookieName}=${token}`);
  }
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

describe('proxy', () => {
  afterEach(() => {
    if (initialSessionCookieName === undefined) {
      delete process.env.SESSION_COOKIE_NAME;
      return;
    }

    process.env.SESSION_COOKIE_NAME = initialSessionCookieName;
  });

  it('lets public routes pass without auth headers', () => {
    const response = proxy(buildRequest('/login'));

    expect(response.headers.get('x-auth-required')).toBeNull();
  });

  it('marks protected routes as auth-required when no session cookie is present', () => {
    const response = proxy(buildRequest('/tokens'));

    expect(response.headers.get('x-auth-required')).toBe('true');
  });

  it('does not parse cookie contents or propagate role headers for security', () => {
    const token = buildManagementSessionToken();
    const response = proxy(buildRequest('/tokens', token));

    expect(response.headers.get('x-auth-required')).toBeNull();
    expect(response.headers.get('x-forbidden')).toBeNull();
    expect(response.headers.get('x-required-role')).toBeNull();
    expect(response.headers.get('x-current-role')).toBeNull();
  });

  it('honors a custom management session cookie name from env', () => {
    process.env.SESSION_COOKIE_NAME = 'ops_session';

    const token = buildManagementSessionToken();
    const response = proxy(buildRequest('/tokens', token, 'ops_session'));

    expect(response.headers.get('x-auth-required')).toBeNull();
  });
});
