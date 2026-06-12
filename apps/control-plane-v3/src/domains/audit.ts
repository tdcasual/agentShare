/**
 * VaultGate Audit Domain
 *
 * Provides SWR hooks for audit log queries.
 */

'use client';

import useSWR from 'swr';
import {
  listAuditLogs as apiListAuditLogs,
  type AuditLog,
  type AuditLogsQuery,
} from '@/lib/vaultgate-api';

// Cache key prefix
const AUDIT_CACHE_KEY = '/api/audit-logs';

// ============================================
// Hooks
// ============================================

export function useAuditLogs(query: AuditLogsQuery = {}) {
  // Build cache key from query
  const params = new URLSearchParams();
  if (query.limit) params.set('limit', query.limit.toString());
  if (query.offset) params.set('offset', query.offset.toString());
  if (query.token_id) params.set('token_id', query.token_id);
  if (query.secret_id) params.set('secret_id', query.secret_id);
  if (query.action) params.set('action', query.action);
  const cacheKey = `${AUDIT_CACHE_KEY}?${params.toString()}`;

  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => apiListAuditLogs(query)
  );

  return {
    logs: data?.items ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 50,
    offset: data?.offset ?? 0,
    isLoading,
    error,
  };
}

export function useAuditStats() {
  const { logs, isLoading, error } = useAuditLogs({ limit: 100 });

  // Calculate stats
  const stats = {
    total: logs.length,
    granted: logs.filter((log) => log.granted).length,
    denied: logs.filter((log) => !log.granted).length,
    recent: logs.filter(
      (log) => new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
  };

  return {
    stats,
    isLoading,
    error,
  };
}
