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

// 状态过滤器配置
const statusFilters: { value: ApprovalStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)]' },
  { value: 'pending', label: '待审批', color: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)]' },
  { value: 'approved', label: '已批准', color: 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]' },
  { value: 'rejected', label: '已拒绝', color: 'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]' },
];

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
        <PageLoader message="加载审批列表..." />
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
            <h2 className="mb-2 text-xl font-bold text-[var(--kw-text)]">加载失败</h2>
            <p className="mb-4 text-[var(--kw-text-muted)]">
              {error instanceof Error ? error.message : '未知错误'}
            </p>
            <Button variant="kawaii" onClick={() => refresh()}>
              重试
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
            <ManagementSessionExpiredAlert message={t("approvals.sessionExpired")} />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message={t("approvals.sessionForbidden")} />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && gateError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
            >
              {gateError}
            </Card>
          ) : null}

          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">审批管理</h1>
              <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">审核来自智能体和用户的请求</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleRefresh();
              }}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              刷新
            </Button>
          </div>

          {refreshError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
            >
              {refreshError}
            </Card>
          ) : null}

          {actionError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
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
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">待审批</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kw-green-surface)]">
                  <CheckCircle className="h-5 w-5 text-[var(--kw-green-text)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">已批准</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
                  <XCircle className="h-5 w-5 text-[var(--kw-error)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-[var(--kw-text-muted)]">已拒绝</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 过滤器 */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--kw-text-muted)]" />
            {statusFilters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? filter.color
                    : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-text-muted)]'
                }`}
              >
                {filter.label}
                {filter.value !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {filter.value === 'pending' && stats.pending}
                    {filter.value === 'approved' && stats.approved}
                    {filter.value === 'rejected' && stats.rejected}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 审批列表 */}
          <div className="space-y-4">
            {approvals.length === 0 ? (
              <Card variant="kawaii" className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-primary-100)]">
                  <CheckCircle className="h-10 w-10 text-[var(--kw-primary-500)]" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
                  暂无审批请求
                </h3>
                <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
                  当前没有
                  {statusFilter === 'all'
                    ? ''
                    : statusFilters.find((f) => f.value === statusFilter)?.label}
                  的审批请求
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
              共 {total} 条记录
            </p>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
});

export default function ApprovalsPage() {
  return (
    <ManagementRouteGuard>
      <ApprovalsContent />
    </ManagementRouteGuard>
  );
}
