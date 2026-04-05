/**
 * Approvals Page - 审批管理页面
 * 
 * operator+ 角色可访问
 * 显示待审批列表，支持批准/拒绝操作
 */

'use client';

import { useState, useMemo } from 'react';
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

import { 
  useApprovals, 
  useApprovalActions 
} from '@/domains/approval/hooks';
import { ApprovalCard } from '@/domains/approval/components/approval-card';
import type { ApprovalStatus } from '@/domains/approval/types';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Filter,
  RefreshCw
} from 'lucide-react';

// 状态过滤器配置
const statusFilters: { value: ApprovalStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: '待审批', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'approved', label: '已批准', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: '已拒绝', color: 'bg-red-100 text-red-700' },
];

function ApprovalsContent() {
  useI18n();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const { 
    approvals, 
    total, 
    isLoading, 
    error, 
    refresh 
  } = useApprovals(
    statusFilter === 'all' ? undefined : { status: statusFilter },
    { revalidateOnFocus: true }
  );
  
  const { 
    approve, 
    reject, 
    isProcessing: isActionProcessing 
  } = useApprovalActions();
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
      pending: approvals.filter(a => a.status === 'pending').length,
      approved: approvals.filter(a => a.status === 'approved').length,
      rejected: approvals.filter(a => a.status === 'rejected').length,
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
      setActionError(actionError instanceof Error ? actionError.message : 'Failed to approve request');
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
      setActionError(actionError instanceof Error ? actionError.message : 'Failed to reject request');
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
      setRefreshError(refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh approvals');
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
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card variant="kawaii" className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              加载失败
            </h2>
            <p className="text-gray-600 mb-4">
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
            <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to review approvals." />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message="You do not have permission to review approvals. Use a higher-privilege management session to continue." />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && gateError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            >
              {gateError}
            </Card>
          ) : null}

          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                审批管理
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                审核来自智能体和用户的请求
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleRefresh();
              }}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              刷新
            </Button>
          </div>

          {refreshError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            >
              {refreshError}
            </Card>
          ) : null}

          {actionError ? (
            <Card
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            >
              {actionError}
            </Card>
          ) : null}
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-gray-500">待审批</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-gray-500">已批准</p>
                </div>
              </div>
            </Card>
            <Card variant="gradient" className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-gray-500">已拒绝</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* 过滤器 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? filter.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                  暂无审批请求
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  当前没有{statusFilter === 'all' ? '' : statusFilters.find(f => f.value === statusFilter)?.label}的审批请求
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
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              共 {total} 条记录
            </p>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default function ApprovalsPage() {
  return (
    <ManagementRouteGuard>
      <ApprovalsContent />
    </ManagementRouteGuard>
  );
}
