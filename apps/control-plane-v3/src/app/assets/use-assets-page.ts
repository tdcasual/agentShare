'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccessTokens, useOpenClawAgents } from '@/domains/identity';
import {
  deriveGovernanceStatus,
  isGovernanceInventoryActive,
  useCapabilities,
  useSecrets,
} from '@/domains/governance';
import {
  useManagementPageSessionRecovery,
  isUnauthorizedError,
} from '@/lib/management-session-recovery';
import { readFocusedEntry } from '@/lib/focused-entry';
import { useI18n } from '@/components/i18n-provider';

export type FlattenedToken = {
  id: string;
  label: string;
  agentId: string;
  agentName: string;
  status: string;
  labels: Record<string, string>;
};

export function useAssetsPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);

  const openClawAgentsQuery = useOpenClawAgents();
  const accessTokensQuery = useAccessTokens();

  const secretsQuery = useSecrets();
  const capabilitiesQuery = useCapabilities();

  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([
    openClawAgentsQuery.error,
    accessTokensQuery.error,
    secretsQuery.error,
    capabilitiesQuery.error,
  ]);

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPublicationFilter, setSelectedPublicationFilter] = useState<
    'all' | 'pending_review' | 'active'
  >('all');
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<
    'all' | 'secrets' | 'capabilities'
  >(() => {
    if (focus.resourceKind === 'secret') {
      return 'secrets';
    }
    if (focus.resourceKind === 'capability') {
      return 'capabilities';
    }
    return 'all';
  });

  const agents = useMemo(() => openClawAgentsQuery.data?.items ?? [], [openClawAgentsQuery.data]);
  const secrets = useMemo(() => secretsQuery.data?.items ?? [], [secretsQuery.data]);
  const capabilities = useMemo(() => capabilitiesQuery.data?.items ?? [], [capabilitiesQuery.data]);

  const allTokens = useMemo<FlattenedToken[]>(() => {
    const agentNameById = Object.fromEntries(agents.map((agent) => [agent.id, agent.name]));
    return (accessTokensQuery.data?.items ?? []).map((token) => ({
      id: token.id,
      label: token.displayName ?? token.id,
      agentId: token.subjectType === 'openclaw_agent' ? token.subjectId : token.id,
      agentName:
        token.subjectType === 'openclaw_agent'
          ? (agentNameById[token.subjectId] ?? token.subjectId)
          : `${token.subjectType}:${token.subjectId}`,
      status: token.status,
      labels: token.labels ?? {},
    }));
  }, [agents, accessTokensQuery.data]);

  const tokenNameById = useMemo(
    () =>
      Object.fromEntries(
        allTokens.map((token) => [token.id, `${token.label} · ${token.agentName}`])
      ),
    [allTokens]
  );

  const tokenLabelOptions = useMemo(() => {
    const valuesByKey = new Map<string, Set<string>>();
    for (const token of allTokens) {
      for (const [key, value] of Object.entries(token.labels)) {
        if (!value) {
          continue;
        }
        const bucket = valuesByKey.get(key) ?? new Set<string>();
        bucket.add(value);
        valuesByKey.set(key, bucket);
      }
    }
    return Object.fromEntries(
      Array.from(valuesByKey.entries()).map(([key, values]) => [key, Array.from(values).sort()])
    ) as Record<string, string[]>;
  }, [allTokens]);

  const loading =
    gateLoading ||
    openClawAgentsQuery.isLoading ||
    accessTokensQuery.isLoading ||
    secretsQuery.isLoading ||
    capabilitiesQuery.isLoading;

  const combinedError =
    gateError ??
    error ??
    (openClawAgentsQuery.error instanceof Error && !isUnauthorizedError(openClawAgentsQuery.error)
      ? openClawAgentsQuery.error.message
      : null) ??
    (accessTokensQuery.error instanceof Error && !isUnauthorizedError(accessTokensQuery.error)
      ? accessTokensQuery.error.message
      : null) ??
    (secretsQuery.error instanceof Error && !isUnauthorizedError(secretsQuery.error)
      ? secretsQuery.error.message
      : null) ??
    (capabilitiesQuery.error instanceof Error && !isUnauthorizedError(capabilitiesQuery.error)
      ? capabilitiesQuery.error.message
      : null);

  const metrics = useMemo(() => {
    const restrictedCapabilities = capabilities.filter(
      (capability) => capability.access_policy.mode === 'selectors'
    ).length;
    const activeTokens = allTokens.filter((token) => token.status === 'active').length;
    const pendingReviewItems =
      secrets.filter((secret) => deriveGovernanceStatus(secret) === 'pending_review').length +
      capabilities.filter((capability) => deriveGovernanceStatus(capability) === 'pending_review')
        .length;
    const activeAssets =
      secrets.filter((secret) => isGovernanceInventoryActive(deriveGovernanceStatus(secret)))
        .length +
      capabilities.filter((capability) =>
        isGovernanceInventoryActive(deriveGovernanceStatus(capability))
      ).length;
    return {
      restrictedCapabilities,
      activeTokens,
      pendingReviewItems,
      activeAssets,
    };
  }, [secrets, capabilities, allTokens]);

  const visibleSecrets = useMemo(() => {
    return secrets.filter((secret) => {
      const governanceStatus = deriveGovernanceStatus(secret);
      if (selectedResourceFilter === 'capabilities') {
        return false;
      }
      if (selectedPublicationFilter === 'pending_review' && governanceStatus !== 'pending_review') {
        return false;
      }
      if (
        selectedPublicationFilter === 'active' &&
        !isGovernanceInventoryActive(governanceStatus)
      ) {
        return false;
      }
      return true;
    });
  }, [secrets, selectedResourceFilter, selectedPublicationFilter]);

  const visibleCapabilities = useMemo(() => {
    return capabilities.filter((capability) => {
      const governanceStatus = deriveGovernanceStatus(capability);
      if (selectedResourceFilter === 'secrets') {
        return false;
      }
      if (selectedPublicationFilter === 'pending_review' && governanceStatus !== 'pending_review') {
        return false;
      }
      if (
        selectedPublicationFilter === 'active' &&
        !isGovernanceInventoryActive(governanceStatus)
      ) {
        return false;
      }
      return true;
    });
  }, [capabilities, selectedResourceFilter, selectedPublicationFilter]);

  const focusedSecret =
    secrets.find((secret) => focus.resourceKind === 'secret' && secret.id === focus.resourceId) ??
    null;
  const focusedCapability =
    capabilities.find(
      (capability) => focus.resourceKind === 'capability' && capability.id === focus.resourceId
    ) ?? null;
  const focusedAsset = focusedSecret ?? focusedCapability;

  const handleRefresh = useCallback(async () => {
    setError(null);
    setRefreshError(null);
    setIsRefreshing(true);
    clearAllAuthErrors();

    try {
      await Promise.all([
        secretsQuery.mutate(),
        capabilitiesQuery.mutate(),
        openClawAgentsQuery.mutate(),
        accessTokensQuery.mutate(),
      ]);
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }
      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('assets.errors.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    secretsQuery,
    capabilitiesQuery,
    openClawAgentsQuery,
    accessTokensQuery,
    clearAllAuthErrors,
    consumeUnauthorized,
    t,
  ]);

  return {
    t,
    session,
    agents,
    secrets,
    capabilities,
    allTokens,
    tokenNameById,
    tokenLabelOptions,
    loading,
    gateLoading,
    gateError,
    combinedError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    refreshError,
    isRefreshing,
    handleRefresh,
    selectedPublicationFilter,
    setSelectedPublicationFilter,
    selectedResourceFilter,
    setSelectedResourceFilter,
    visibleSecrets,
    visibleCapabilities,
    metrics,
    focusedAsset,
    focus,
    error,
    setError,
    clearAllAuthErrors,
    consumeUnauthorized,
    secretsQuery,
    capabilitiesQuery,
  };
}
