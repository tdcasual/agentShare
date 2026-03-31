import { describe, expect, it } from 'vitest';
import { buildBackendApiUrl } from './backend-api-url';

describe('buildBackendApiUrl', () => {
  it('adds a single api prefix when the backend base is origin-only', () => {
    expect(buildBackendApiUrl('http://localhost:8000', '/session/me')).toBe(
      'http://localhost:8000/api/session/me',
    );
  });

  it('does not add a second api prefix when the backend base already ends with api', () => {
    expect(buildBackendApiUrl('http://localhost:8000/api', '/session/me')).toBe(
      'http://localhost:8000/api/session/me',
    );
  });

  it('normalizes missing leading slashes in the forwarded path', () => {
    expect(buildBackendApiUrl('http://localhost:8000', 'tasks')).toBe(
      'http://localhost:8000/api/tasks',
    );
  });

  it('trims duplicate trailing slashes from the backend base', () => {
    expect(buildBackendApiUrl('http://localhost:8000/', '/bootstrap/status')).toBe(
      'http://localhost:8000/api/bootstrap/status',
    );
  });
});
