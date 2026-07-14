'use client';

import useSWR from 'swr';
import { getAuditStats, listAuditLogs } from '@/lib/vaultgate-api';

export function useAuditLogs(
  query: { result?: string; action?: string; limit?: number; offset?: number } = {}
) {
  const key = `/api/admin/audit-logs?${new URLSearchParams(
    Object.entries(query).flatMap(([name, value]) =>
      value === undefined ? [] : [[name, String(value)]]
    )
  )}`;
  const { data, error, isLoading } = useSWR(key, () => listAuditLogs(query));
  return { logs: data?.items ?? [], total: data?.total ?? 0, isLoading, error };
}

export function useAuditStats() {
  const { data, error, isLoading } = useSWR('/api/admin/audit-stats', getAuditStats);
  return { stats: data, isLoading, error };
}
