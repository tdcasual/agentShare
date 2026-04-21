/**
 * API Client 基础配置
 *
 * 提供：
 * - 基础请求函数 apiFetch
 * - 错误处理 ApiError
 * - 类型定义
 */

'use client';

// 使用同域代理路径，避免跨域问题
const API_BASE_URL = '/api';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

/**
 * 基础 API 请求函数
 */
export async function apiFetch<T>(
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

    const text = await response.text();
    let payload: JsonValue | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as JsonValue;
      } catch {
        throw new ApiError(response.status, '响应格式错误，无法解析 JSON');
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

    // Note: Runtime validation would be better, but for now we trust the API
    // Consider using zod or similar for runtime type checking
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, '请求超时，请检查网络连接');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// 共享类型定义
// ============================================

export interface SetupOwnerInput {
  bootstrap_key: string;
  email: string;
  display_name: string;
  password: string;
}

export interface AgentCreateInput {
  name: string;
  risk_tier: string;
  allowed_capability_ids?: string[];
  allowed_task_types?: string[];
}

export interface AgentCreateResponse {
  id: string;
  name: string;
  risk_tier: string;
  api_key: string;
  token_id: string;
  token_prefix: string;
}

export interface AdminAccountCreateInput {
  email: string;
  display_name: string;
  password: string;
  role: 'viewer' | 'operator' | 'admin';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AccessTokenCreateInput {
  display_name: string;
  subject_type?: string;
  subject_id: string;
  scopes?: string[];
  labels?: Record<string, string>;
  policy?: Record<string, unknown>;
  expires_at?: string | null;
}

export interface AccessTokenCreateResponse {
  id: string;
  display_name: string;
  token_prefix: string;
  status: string;
  subject_type: string;
  subject_id: string;
  scopes?: string[];
  labels?: Record<string, string>;
  policy?: Record<string, unknown>;
  trust_score: number;
  expires_at?: string | null;
  issued_by_actor_type?: string;
  issued_by_actor_id?: string;
  last_used_at?: string | null;
  last_feedback_at?: string | null;
  completed_runs?: number;
  successful_runs?: number;
  success_rate?: number;
  api_key?: string;
}

export interface TaskCreateInput {
  title: string;
  task_type: string;
  input?: Record<string, unknown>;
  required_capability_ids?: string[];
  playbook_ids?: string[];
  lease_allowed?: boolean;
  approval_mode?: 'auto' | 'manual';
  approval_rules?: Array<Record<string, unknown>>;
  priority?: string;
  target_access_token_ids?: string[];
  target_mode?: 'explicit_access_tokens' | 'broadcast';
}

export interface TokenFeedbackCreateInput {
  score: number;
  verdict: string;
  summary: string;
}

export interface AccessTokenFeedbackCreateInput {
  score: number;
  verdict: string;
  summary: string;
}
