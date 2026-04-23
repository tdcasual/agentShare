/**
 * Approvals Page - 审批管理页面
 *
 * operator+ 角色可访问
 * 显示待审批列表，支持批准/拒绝操作
 */

'use client';

import { useState, useMemo, memo } from 'react';
import { Layout } from '@/interfaces/human/layout';
import { ManagementRouteGuard } from '@/components/route-guard';
import { useI18n } from '@/components/i18n-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageLoader } from '@/components/kawaii/page-loader';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';

import { useApprovals, useApprovalActions } from '@/domains/approval/hooks';
import { ApprovalCard } from '@/domains/approval/components/approval-card';
import type { ApprovalStatus } from '@/domains/approval/types';
import { CheckCircle, Clock, XCircle, Filter, RefreshCw } from 'lucide-react';

function getApprovalStatusLabel(
  status: ApprovalStatus | 'all',
  t: (key: string) => string
): string {
  if (status === 'all') {
    return t('common.all');
  }

  return t(`approvals.status.${status}`);
}

const ApprovalsContent = memo(function ApprovalsContent() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { approvals, total, isLoading, error, refresh } = useApprovals(
    statusFilter === 'all' ? undefined : { status: statusFilter },
    { revalidateOnFocus: true }
  );

  const { approve, reject, isProcessing: isActionProcessing } = useApprovalActions();
  const {
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(error);

  // 统计
  const stats = useMemo(() => {
    return {
      pending: approvals.filter((a) => a.status === 'pending').length,
      approved: approvals.filter((a) => a.status === 'approved').length,
      rejected: approvals.filter((a) => a.status === 'rejected').length,
    };
  }, [approvals]);

  // 处理批准
  const handleApprove = async (id: string) => {
    clearAllAuthErrors();
    setActionError(null);
    setRefreshError(null);

    try {
      await approve(id);
    } catch (actionError) {
      if (consumeUnauthorized(actionError)) {
        return;
      }
      setActionError(
        actionError instanceof Error ? actionError.message : t('approvals.approveFailed')
      );
    }
  };

  // 处理拒绝
  const handleReject = async (id: string, reason: string) => {
    clearAllAuthErrors();
    setActionError(null);
    setRefreshError(null);

    try {
      await reject(id, { reason });
    } catch (actionError) {
      if (consumeUnauthorized(actionError)) {
        return;
      }
      setActionError(
        actionError instanceof Error ? actionError.message : t('approvals.rejectFailed')
      );
    }
  };

  const handleRefresh = async () => {
    clearAllAuthErrors();
    setActionError(null);
    setRefreshError(null);

    try {
      await refresh();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }
      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('approvals.refreshFailed')
      );
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <Layout>
        <PageLoader message={t('approvals.loading')} />
      </Layout>
    );
  }

  // 错误状态
  if (error && !shouldShowSessionExpired && !shouldShowForbidden) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <Card variant="kawaii" className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
              <XCircle className="h-8 w-8 text-[var(--kw-error)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
              {t('approvals.loadFailed')}
            </h2>
            <p className="mb-4 text-[var(--kw-text-muted)]">
              {error instanceof Error ? error.message : t('common.unknownError')}
            </p>
            <Button variant="kawaii" onClick={() => refresh()}>
              {t('common.retry')}
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <div className="space-y-6">
          {shouldShowSessionExpired ? (
            <ManagementSessionExpiredAlert message={t('approvals.sessionExpired')} />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message={t('approvals.sessionForbidden')} />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && gateError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
            >
              {gateError}
            </Card>
          ) : null}

          {/* 页面标题 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
                {t('approvals.title')}
              </h1>
              <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
                {t('approvals.description')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleRefresh();
              }}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              {t('common.refresh')}
            </Button>
          </div>

          {refreshError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
            >
              {refreshError}
            </Card>
          ) : null}

          {actionError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
            >
              {actionError}
            </Card>
          ) : null}

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kw-orange-surface)]">
                  <Clock className="h-5 w-5 text-[var(--kw-orange-text)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">{stats.pending}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">
                    {getApprovalStatusLabel('pending', t)}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kw-green-surface)]">
                  <CheckCircle className="h-5 w-5 text-[var(--kw-green-text)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">{stats.approved}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">
                    {getApprovalStatusLabel('approved', t)}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
                  <XCircle className="h-5 w-5 text-[var(--kw-error)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">{stats.rejected}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">
                    {getApprovalStatusLabel('rejected', t)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* 过滤器 */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--kw-text-muted)]" />
            <StatusFilterButton
              value="all"
              label={t('common.all')}
              activeColor="bg-[var(--kw-surface-alt)] text-[var(--kw-text)]"
              active={statusFilter === 'all'}
              count={undefined}
              onSelect={setStatusFilter}
            />
            <StatusFilterButton
              value="pending"
              label={getApprovalStatusLabel('pending', t)}
              activeColor="bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)]"
              active={statusFilter === 'pending'}
              count={stats.pending}
              onSelect={setStatusFilter}
            />
            <StatusFilterButton
              value="approved"
              label={getApprovalStatusLabel('approved', t)}
              activeColor="bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]"
              active={statusFilter === 'approved'}
              count={stats.approved}
              onSelect={setStatusFilter}
            />
            <StatusFilterButton
              value="rejected"
              label={getApprovalStatusLabel('rejected', t)}
              activeColor="bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]"
              active={statusFilter === 'rejected'}
              count={stats.rejected}
              onSelect={setStatusFilter}
            />
          </div>

          {/* 审批列表 */}
          <div className="space-y-4" role="list">
            {approvals.length === 0 ? (
              <Card variant="kawaii" className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-primary-100)]">
                  <CheckCircle className="h-10 w-10 text-[var(--kw-primary-500)]" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
                  {t('approvals.emptyTitle')}
                </h3>
                <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
                  {statusFilter === 'all'
                    ? t('approvals.emptyDescAll')
                    : t('approvals.emptyDescFiltered').replace(
                        '{status}',
                        getApprovalStatusLabel(statusFilter, t)
                      )}
                </p>
              </Card>
            ) : (
              approvals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={isActionProcessing}
                />
              ))
            )}
          </div>

          {/* 总数提示 */}
          {total > 0 && (
            <p className="text-center text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
              {t('approvals.totalRecords').replace('{count}', String(total))}
            </p>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
});

interface StatusFilterButtonProps {
  value: 'all' | 'pending' | 'approved' | 'rejected';
  label: string;
  activeColor: string;
  active: boolean;
  count: number | undefined;
  onSelect: (value: 'all' | 'pending' | 'approved' | 'rejected') => void;
}

const StatusFilterButton = memo(function StatusFilterButton({
  value,
  label,
  activeColor,
  active,
  count,
  onSelect,
}: StatusFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? activeColor
          : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-text-muted)]'
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-xs opacity-70">{count}</span>}
    </button>
  );
});

export default function ApprovalsPage() {
  return (
    <ManagementRouteGuard>
      <ApprovalsContent />
    </ManagementRouteGuard>
  );
}
