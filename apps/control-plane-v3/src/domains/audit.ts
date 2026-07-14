'use client';

import useSWR from 'swr';
import { buildApiPath, getAuditStats, listAuditLogs, type AuditQuery } from '@/lib/vaultgate-api';

export function useAuditLogs(query: AuditQuery = {}) {
  const key = buildApiPath('/api/admin/audit-logs', query);
  const { data, error, isLoading } = useSWR(key, () => listAuditLogs(query));
  return { logs: data?.items ?? [], total: data?.total ?? 0, isLoading, error };
}

export function useAuditStats() {
  const { data, error, isLoading } = useSWR('/api/admin/audit-stats', getAuditStats);
  return { stats: data, isLoading, error };
}
