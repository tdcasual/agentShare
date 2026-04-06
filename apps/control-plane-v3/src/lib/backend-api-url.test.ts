import { describe, expect, it } from 'vitest';
import { buildBackendApiUrl } from './backend-api-url';
import { resolveApiBaseUrl } from './proxy-api-url';

describe('buildBackendApiUrl', () => {
  it('adds a single api prefix when the backend base is origin-only', () => {
    expect(buildBackendApiUrl('http://localhost:8000', '/session/me')).toBe(
      'http://localhost:8000/api/session/me'
    );
  });

  it('does not add a second api prefix when the backend base already ends with api', () => {
    expect(buildBackendApiUrl('http://localhost:8000/api', '/session/me')).toBe(
      'http://localhost:8000/api/session/me'
    );
  });

  it('normalizes missing leading slashes in the forwarded path', () => {
    expect(buildBackendApiUrl('http://localhost:8000', 'tasks')).toBe(
      'http://localhost:8000/api/tasks'
    );
  });

  it('trims duplicate trailing slashes from the backend base', () => {
    expect(buildBackendApiUrl('http://localhost:8000/', '/bootstrap/status')).toBe(
      'http://localhost:8000/api/bootstrap/status'
    );
  });
});

describe('resolveApiBaseUrl', () => {
  it('prefers BACKEND_API_URL when both backend env vars are present', () => {
    expect(
      resolveApiBaseUrl({
        BACKEND_API_URL: 'http://backend.internal:8000',
        AGENT_CONTROL_PLANE_API_URL: 'http://api:8000',
      })
    ).toBe('http://backend.internal:8000');
  });

  it('falls back to AGENT_CONTROL_PLANE_API_URL when BACKEND_API_URL is absent', () => {
    expect(
      resolveApiBaseUrl({
        AGENT_CONTROL_PLANE_API_URL: 'http://api:8000',
      })
    ).toBe('http://api:8000');
  });

  it('uses localhost default when both env vars are absent', () => {
    expect(resolveApiBaseUrl({})).toBe('http://localhost:8000');
  });
});
