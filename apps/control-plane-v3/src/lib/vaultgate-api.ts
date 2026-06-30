/**
 * VaultGate API Client
 *
 * Provides typed API methods for VaultGate:
 * - Authentication (login, logout, me)
 * - Secrets CRUD
 * - Token management
 * - Scope management
 * - Audit logs
 */

'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const { timeout = 30000, signal: externalSignal, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let payload: JsonValue | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as JsonValue;
      } catch {
        throw new ApiError(response.status, 'Invalid JSON response');
      }
    }

    if (!response.ok) {
      const detail =
        payload &&
        typeof payload === 'object' &&
        'detail' in payload &&
        typeof payload.detail === 'string'
          ? payload.detail
          : response.statusText;
      throw new ApiError(response.status, detail);
    }

    return payload as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {throw error;}
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timeout');
    }
    throw error;
  }
}

/**
 * Generic API fetch function.
 * Returns the parsed JSON response body directly.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeout?: number } = {}
): Promise<T> {
  return requestJson<T>(path, init);
}

// ============================================
// Type Definitions
// ============================================

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Secret {
  id: string;
  user_id: string;
  type: SecretType;
  name: string;
  url?: string;
  username?: string;
  description?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SecretType =
  | 'password'
  | 'api_key'
  | 'basic_auth'
  | 'bearer_token'
  | 'api_key_header'
  | 'oauth_token'
  | 'certificate'
  | 'ssh_key'
  | 'database_url'
  | 'custom';

export interface SecretCreateInput {
  type: SecretType;
  name: string;
  url?: string;
  username?: string;
  description?: string;
  value: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SecretUpdateInput {
  name?: string;
  url?: string;
  username?: string;
  description?: string;
  value?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Token {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface TokenCreateInput {
  name: string;
  description?: string;
  expires_at?: string | null;
}

export interface TokenCreateResponse {
  id: string;
  name: string;
  token: string; // Only shown once
  key_prefix: string;
  status: string;
  expires_at: string | null;
}

export interface Scope {
  id: string;
  token_id: string;
  secret_id: string;
  allowed: boolean;
  created_at: string;
}

export interface ScopeCreateInput {
  secret_ids: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  token_id: string | null;
  secret_id: string | null;
  action: string;
  granted: boolean;
  requested_field_count: number | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================
// Authentication API
// ============================================

export async function login(input: LoginInput): Promise<{ message: string; user_id: string; email: string }> {
  return requestJson('/session/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<{ message: string }> {
  return requestJson('/session/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<User> {
  return requestJson('/session/me');
}

// ============================================
// Secrets API
// ============================================

export async function listSecrets(): Promise<{ items: Secret[]; total: number }> {
  return requestJson('/secrets');
}

export async function createSecret(input: SecretCreateInput): Promise<Secret> {
  return requestJson('/secrets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSecret(id: string, input: SecretUpdateInput): Promise<Secret> {
  return requestJson(`/secrets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteSecret(id: string): Promise<{ message: string }> {
  return requestJson(`/secrets/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Tokens API
// ============================================

export async function listTokens(): Promise<{ items: Token[]; total: number }> {
  return requestJson('/tokens');
}

export async function createToken(input: TokenCreateInput): Promise<TokenCreateResponse> {
  return requestJson('/tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeToken(id: string): Promise<{ message: string }> {
  return requestJson(`/tokens/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Scopes API
// ============================================

export async function listScopes(tokenId: string): Promise<{ items: Scope[]; total: number }> {
  return requestJson(`/tokens/${tokenId}/scopes`);
}

export async function createScopes(tokenId: string, input: ScopeCreateInput): Promise<{ items: Scope[] }> {
  return requestJson(`/tokens/${tokenId}/scopes`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteScope(tokenId: string, secretId: string): Promise<{ message: string }> {
  return requestJson(`/tokens/${tokenId}/scopes/${secretId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Audit Logs API
// ============================================

export interface AuditLogsQuery {
  limit?: number;
  offset?: number;
  token_id?: string;
  secret_id?: string;
  action?: string;
}

export async function listAuditLogs(query: AuditLogsQuery = {}): Promise<{
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  if (query.limit) {params.set('limit', query.limit.toString());}
  if (query.offset) {params.set('offset', query.offset.toString());}
  if (query.token_id) {params.set('token_id', query.token_id);}
  if (query.secret_id) {params.set('secret_id', query.secret_id);}
  if (query.action) {params.set('action', query.action);}

  const queryString = params.toString();
  return requestJson(`/audit-logs${queryString ? `?${queryString}` : ''}`);
}
