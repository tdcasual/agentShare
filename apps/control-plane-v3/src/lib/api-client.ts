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
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as JsonValue) : null;

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

export interface AgentTokenCreateInput {
  display_name: string;
  scopes?: string[];
  labels?: Record<string, string>;
  expires_at?: string | null;
}

export interface AgentTokenCreateResponse {
  id: string;
  agent_id: string;
  display_name: string;
  token_prefix: string;
  api_key: string;
  trust_score: number;
  risk_tier: string;
  auth_method: string;
  status: string;
  scopes?: string[];
  labels?: Record<string, string>;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
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
  target_token_ids?: string[];
  target_mode?: 'explicit_tokens' | 'broadcast';
}

export interface TokenFeedbackCreateInput {
  score: number;
  verdict: string;
  summary: string;
}
