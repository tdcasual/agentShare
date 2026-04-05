/**
 * Session State - 集中式会话状态管理
 * 
 * 提供：
 * - 标准化的会话状态模型
 * - 会话解析和验证
 * - 会话刷新和注销
 */

import { useCallback, useEffect, useState } from 'react';
import type { ManagementSessionSummary } from '@/shared/types';
import { ApiError, apiFetch } from './api-client';

export type SessionState = 
  | 'unknown'      // 初始状态，正在解析
  | 'anonymous'    // 未登录
  | 'authenticated' // 已认证
  | 'expired'      // 会话过期
  | 'forbidden'    // 无权限
  | 'unavailable'; // 服务不可用

export interface SessionData {
  state: SessionState;
  email?: string;
  role?: string;
  sessionId?: string;
  lastLoadedAt?: number;
  error?: string;
}

function sessionSummaryToSessionData(session: ManagementSessionSummary): SessionData {
  return {
    state: 'authenticated',
    email: session.email,
    role: session.role,
    sessionId: session.session_id,
    lastLoadedAt: Date.now(),
  };
}

// 全局会话状态（用于非React上下文）
let globalSession: SessionData = { state: 'unknown' };
let sessionListeners: ((session: SessionData) => void)[] = [];

function notifyListeners() {
  sessionListeners.forEach(listener => listener(globalSession));
}

export function getGlobalSession(): SessionData {
  return globalSession;
}

export function setGlobalSession(session: SessionData) {
  globalSession = session;
  notifyListeners();
}

export function subscribeToSession(listener: (session: SessionData) => void) {
  sessionListeners.push(listener);
  return () => {
    sessionListeners = sessionListeners.filter(l => l !== listener);
  };
}

/**
 * 解析当前会话状态
 */
export async function resolveSession(): Promise<SessionData> {
  try {
    const response = await apiFetch<ManagementSessionSummary>('/session/me', {
      method: 'GET',
    });

    return sessionSummaryToSessionData(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return {
        state: 'anonymous',
        lastLoadedAt: Date.now(),
      };
    }

    if (error instanceof ApiError && error.status === 403) {
      return {
        state: 'forbidden',
        error: error.detail,
        lastLoadedAt: Date.now(),
      };
    }

    return {
      state: 'unavailable',
      error: error instanceof Error ? error.message : 'Session resolution failed',
      lastLoadedAt: Date.now(),
    };
  }
}

/**
 * 登录
 */
export async function login(email: string, password: string): Promise<SessionData> {
  try {
    const response = await apiFetch<ManagementSessionSummary>('/session/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const session = sessionSummaryToSessionData(response);
    setGlobalSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return {
        state: 'anonymous',
        error: 'Invalid credentials',
        lastLoadedAt: Date.now(),
      };
    }

    if (error instanceof ApiError && error.status === 403) {
      return {
        state: 'forbidden',
        error: error.detail,
        lastLoadedAt: Date.now(),
      };
    }

    throw error;
  }
}

/**
 * 注销
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/session/logout', { method: 'POST' });
  } finally {
    setGlobalSession({
      state: 'anonymous',
      lastLoadedAt: Date.now(),
    });
  }
}

/**
 * React Hook: 使用会话状态
 */
export function useSession() {
  const [session, setSession] = useState<SessionData>(getGlobalSession());
  const [isLoading, setIsLoading] = useState(session.state === 'unknown');
  
  useEffect(() => {
    const initialSession = getGlobalSession();

    // 订阅全局会话变化
    const unsubscribe = subscribeToSession(setSession);
    
    // 初始解析（如果未知状态）
    if (initialSession.state === 'unknown') {
      setIsLoading(true);
      resolveSession().then(newSession => {
        setGlobalSession(newSession);
        setIsLoading(false);
      });
    }
    
    return unsubscribe;
  }, []);
  
  const refresh = useCallback(async () => {
    setIsLoading(true);
    const newSession = await resolveSession();
    setGlobalSession(newSession);
    setIsLoading(false);
  }, []);
  
  const doLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await login(email, password);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const doLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    session,
    isLoading,
    refresh,
    login: doLogin,
    logout: doLogout,
  };
}
