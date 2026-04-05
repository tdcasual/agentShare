/**
 * Runs Page - 运行观测页面
 * 
 * viewer+ 角色可访问（后端只要求任意 management session）
 * 显示任务运行历史、状态、结果
 * 
 * DTO 对齐说明：
 * - 后端 /api/runs 返回: id, task_id, agent_id, token_id, task_target_id, status,
 *   result_summary, output_payload, error_summary, capability_invocations, lease_events
 * - 注意：后端不返回 createdAt/startedAt/completedAt 时间戳
 */

'use client';

import { useState, useMemo } from 'react';
import { Layout } from '@/interfaces/human/layout';
import { ManagementRouteGuard } from '@/components/route-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageLoader } from '@/components/kawaii/page-loader';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Badge } from '@/shared/ui-primitives/badge';
import { useRuns } from '@/domains/task/hooks';
import type { Run, RunStatus } from '@/domains/task/types';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';

// 状态配置
const statusConfig: Record<RunStatus, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: { 
    label: '等待中', 
    icon: <Clock className="w-4 h-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
  },
  running: { 
    label: '运行中', 
    icon: <Activity className="w-4 h-4 animate-pulse" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  completed: { 
    label: '已完成', 
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20'
  },
  failed: { 
    label: '失败', 
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20'
  },
  cancelled: { 
    label: '已取消', 
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
};

function RunsContent() {
  const [selectedStatus, setSelectedStatus] = useState<RunStatus | 'all'>('all');
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const { data, isLoading, error, mutate: refresh } = useRuns();
  const {
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(error);
  
  // 获取 runs 数组
  const runs = useMemo(() => data?.items || [], [data]);
  
  // 过滤运行记录
  const filteredRuns = useMemo(() => {
    if (selectedStatus === 'all') {return runs;}
    return runs.filter((r: Run) => r.status === selectedStatus);
  }, [runs, selectedStatus]);
  
  // 统计
  const stats = useMemo(() => {
    return {
      total: runs.length,
      pending: runs.filter((r: Run) => r.status === 'pending').length,
      running: runs.filter((r: Run) => r.status === 'running').length,
      completed: runs.filter((r: Run) => r.status === 'completed').length,
      failed: runs.filter((r: Run) => r.status === 'failed').length,
    };
  }, [runs]);

  const handleRefresh = async () => {
    clearAllAuthErrors();
    setRefreshError(null);

    try {
      await refresh();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }
      setRefreshError(refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh runs');
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <PageLoader message="加载运行记录..." />
      </Layout>
    );
  }
  
  if (error && !shouldShowSessionExpired && !shouldShowForbidden) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card variant="kawaii" className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">加载失败</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button variant="kawaii" onClick={() => refresh()}>重试</Button>
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
            <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to inspect run history." />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message="You do not have permission to inspect run history. Use a management session with the required permission to continue." />
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
                运行观测
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                查看任务执行历史和状态
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
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard 
              label="总计" 
              value={stats.total} 
              icon={<PlayCircle className="w-5 h-5" />}
              color="bg-pink-100 text-pink-600"
            />
            <StatCard 
              label="等待中" 
              value={stats.pending} 
              icon={<Clock className="w-5 h-5" />}
              color="bg-yellow-100 text-yellow-600"
            />
            <StatCard 
              label="运行中" 
              value={stats.running} 
              icon={<Activity className="w-5 h-5" />}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard 
              label="已完成" 
              value={stats.completed} 
              icon={<CheckCircle className="w-5 h-5" />}
              color="bg-green-100 text-green-600"
            />
            <StatCard 
              label="失败" 
              value={stats.failed} 
              icon={<XCircle className="w-5 h-5" />}
              color="bg-red-100 text-red-600"
            />
          </div>
          
          {/* 状态筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedStatus === 'all' ? 'kawaii' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('all')}
            >
              全部 ({stats.total})
            </Button>
            {(['pending', 'running', 'completed', 'failed', 'cancelled'] as RunStatus[]).map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'kawaii' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {statusConfig[status].label} ({runs.filter(r => r.status === status).length})
              </Button>
            ))}
          </div>
          
          {/* 运行列表 */}
          <div className="space-y-3">
            {filteredRuns.length === 0 ? (
              <Card variant="kawaii" className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
                  <Terminal className="w-10 h-10 text-pink-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                  暂无运行记录
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedStatus === 'all' ? '还没有任务被执行' : '该状态下没有运行记录'}
                </p>
              </Card>
            ) : (
              filteredRuns.map((run) => {
                const config = statusConfig[run.status];
                return (
                  <Card 
                    key={run.id} 
                    variant="default"
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedRun(run)}
                  >
                    <div className="flex items-center gap-4">
                      {/* 状态图标 */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} ${config.color}`}>
                        {config.icon}
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-800 dark:text-gray-100 truncate">
                            Run #{run.id.slice(-8)}
                          </h3>
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>任务: {run.task_id.slice(-8)}</span>
                          {run.token_id && <span>Token: {run.token_id.slice(-8)}</span>}
                          {run.agent_id && <span>Agent: {run.agent_id.slice(-8)}</span>}
                        </div>
                      </div>
                      
                      {/* 箭头 */}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
        
        {/* 详情弹窗 */}
        {selectedRun && (
          <RunDetailModal 
            run={selectedRun} 
            onClose={() => setSelectedRun(null)} 
          />
        )}
      </Layout>
    </ErrorBoundary>
  );
}

// 统计卡片组件
function StatCard({ 
  label, 
  value, 
  icon,
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card variant="default" className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// 运行详情弹窗
interface RunDetailModalProps {
  run: Run;
  onClose: () => void;
}

function RunDetailModal({ run, onClose }: RunDetailModalProps) {
  const config = statusConfig[run.status];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card variant="kawaii" className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-pink-100 dark:border-[#3D3D5C]">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor} ${config.color}`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Run 详情
              </h2>
              <p className="text-sm text-gray-500">{run.id}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>
        
        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="状态" value={config.label} />
            <InfoItem label="任务ID" value={run.task_id} />
            <InfoItem label="Agent ID" value={run.agent_id} />
            <InfoItem label="Token ID" value={run.token_id} />
            <InfoItem label="目标ID" value={run.task_target_id} />
          </div>
          
          {/* 结果摘要 */}
          {run.result_summary !== null && run.result_summary !== undefined && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800 dark:text-gray-100">结果摘要</h3>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                {String(run.result_summary)}
              </div>
            </div>
          )}
          
          {/* 错误摘要 */}
          {run.error_summary !== null && run.error_summary !== undefined && (
            <div className="space-y-2">
              <h3 className="font-medium text-red-600">错误</h3>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                {String(run.error_summary)}
              </div>
            </div>
          )}
          
          {/* 输出载荷 */}
          {run.output_payload !== null && run.output_payload !== undefined && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800 dark:text-gray-100">输出</h3>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-48">
                {JSON.stringify(run.output_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        {/* 底部 */}
        <div className="p-6 border-t border-pink-100 dark:border-[#3D3D5C] flex justify-end">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </div>
      </Card>
    </div>
  );
}

// 信息项组件
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

export default function RunsPage() {
  return (
    <ManagementRouteGuard>
      <RunsContent />
    </ManagementRouteGuard>
  );
}
