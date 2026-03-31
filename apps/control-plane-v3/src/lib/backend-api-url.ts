const API_PREFIX = '/api';

export function buildBackendApiUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  const baseWithApiPrefix = normalizedBaseUrl.endsWith(API_PREFIX)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}${API_PREFIX}`;

  return `${baseWithApiPrefix}/${normalizedPath}`;
}
