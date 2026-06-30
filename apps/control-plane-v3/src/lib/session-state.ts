/**
 * Session State - Centralized session state management
 *
 * Provides:
 * - Standardized session state model
 * - Session resolution and validation
 * - Session refresh and logout
 */

import { useEffect, useState } from 'react';
import type { ManagementSessionSummary, ManagementRole } from '@/shared/types';
import { ApiError, apiFetch } from './vaultgate-api';

export type SessionState =
  | 'unknown' // Initial state, resolving
  | 'anonymous' // Not logged in
  | 'authenticated' // Authenticated
  | 'expired' // Session expired
  | 'forbidden' // No permission
  | 'unavailable'; // Service unavailable

export interface SessionData {
  state: SessionState;
  email?: string;
  role?: ManagementRole;
  sessionId?: string;
  lastLoadedAt?: number;
  error?: string;
  /** Full session summary when authenticated — gives access to expires_at, actor_id, etc. */
  summary?: ManagementSessionSummary;
}

function sessionSummaryToSessionData(session: ManagementSessionSummary): SessionData {
  return {
    state: 'authenticated',
    email: session.email,
    role: session.role,
    sessionId: session.session_id,
    lastLoadedAt: Date.now(),
    summary: session,
  };
}

// Global session state (for non-React contexts)
let globalSession: SessionData = { state: 'unknown' };
let sessionListeners: ((session: SessionData) => void)[] = [];

function notifyListeners() {
  sessionListeners.forEach((listener) => listener(globalSession));
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
    sessionListeners = sessionListeners.filter((l) => l !== listener);
  };
}

/**
 * Resolve current session state
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
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/session/logout', { method: 'POST' });
  } finally {
    setGlobalSession({
      state: 'anonymous',
      lastLoadedAt: Date.now(),
    });
    // Clear role store to prevent stale role flash on re-login
    const { useRoleStore } = await import('@/store/role-store');
    useRoleStore.getState().clearRole();
  }
}

/**
 * React Hook: Read global session state (does not trigger API calls)
 * Subscribes to globalSession changes, suitable for pages where RouteGuard has already resolved the session.
 */
export function useGlobalSession() {
  const [session, setSession] = useState<SessionData>(getGlobalSession);

  useEffect(() => {
    const unsubscribe = subscribeToSession(setSession);
    return unsubscribe;
  }, []);

  return session;
}
