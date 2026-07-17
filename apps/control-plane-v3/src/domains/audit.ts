'use client';

import useSWR from 'swr';
import {
  buildApiPath,
  getAuditStats,
  listAuditActions,
  listAuditLogs,
  type AuditQuery,
  type AuditStatsQuery,
} from '@/lib/vaultgate-api';

export function useAuditLogs(query: AuditQuery = {}) {
  const key = buildApiPath('/api/admin/audit-logs', query);
  const { data, error, isLoading, mutate } = useSWR(key, () => listAuditLogs(query));
  return { logs: data?.items ?? [], total: data?.total ?? 0, isLoading, error, refresh: mutate };
}

export function useAuditStats(query: AuditStatsQuery = {}) {
  const key = buildApiPath('/api/admin/audit-stats', query);
  const { data, error, isLoading } = useSWR(key, () => getAuditStats(query));
  return { stats: data, isLoading, error };
}

export function useAuditActions() {
  const { data, error, isLoading } = useSWR('/api/admin/audit-actions', listAuditActions);
  return { actions: data?.items ?? [], isLoading, error };
}
