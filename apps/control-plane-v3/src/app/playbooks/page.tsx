/**
 * Playbooks Page - 手册管理页面
 * 
 * viewer+ 角色可访问（后端只要求任意 management session）
 * 支持搜索、筛选、查看详情
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
import { Input } from '@/shared/ui-primitives/input';
import { 
  usePlaybooks, 
  useCreatePlaybook 
} from '@/domains/playbook/hooks';
import { PlaybookCard } from '@/domains/playbook/components/playbook-card';
import { PlaybookDetail } from '@/domains/playbook/components/playbook-detail';
import type { Playbook, CreatePlaybookInput, PlaybookSearchQuery } from '@/domains/playbook/types';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Tag,
  RefreshCw,
  XCircle,
  Filter
} from 'lucide-react';

// 常见任务类型
const TASK_TYPES = ['all', 'code_review', 'deployment', 'analysis', 'documentation', 'testing'];

function PlaybooksContent() {
  useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // 构建查询参数
  const query = useMemo<PlaybookSearchQuery>(() => {
    return {
      ...(searchQuery && { q: searchQuery }),
      ...(selectedTaskType && selectedTaskType !== 'all' && { taskType: selectedTaskType }),
      ...(selectedTag && { tag: selectedTag }),
    };
  }, [searchQuery, selectedTaskType, selectedTag]);
  
  const { 
    playbooks, 
    total, 
    appliedFilters,
    isLoading, 
    error, 
    refresh 
  } = usePlaybooks(query);
  
  const { create, isCreating } = useCreatePlaybook();
  const {
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(error);
  
  // 提取所有标签
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    playbooks.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags).slice(0, 20);
  }, [playbooks]);
  
  // 处理创建
  const handleCreate = async (input: CreatePlaybookInput) => {
    clearAllAuthErrors();
    setActionError(null);
    setRefreshError(null);

    try {
      await create(input);
      setShowCreateForm(false);
    } catch (actionError) {
      if (consumeUnauthorized(actionError)) {
        return;
      }
      setActionError(actionError instanceof Error ? actionError.message : 'Failed to create playbook');
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
      setRefreshError(refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh playbooks');
    }
  };
  
  // 加载中
  if (isLoading) {
    return (
      <Layout>
        <PageLoader message="加载手册列表..." />
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
            <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to browse playbooks." />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message="You do not have permission to view playbooks. Use a management session with the required permission to continue." />
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
                Playbook 手册
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                浏览和搜索可复用的执行手册
              </p>
            </div>
            <div className="flex gap-2">
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
              <Button
                variant="kawaii"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                新建
              </Button>
            </div>
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
          
          {/* 搜索和筛选 */}
          <Card variant="default" className="p-4">
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索手册标题和内容..."
                  className="pl-10"
                />
              </div>
              
              {/* 任务类型筛选 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">类型:</span>
                {TASK_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTaskType(type)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTaskType === type
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 font-medium'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? '全部' : type}
                  </button>
                ))}
              </div>
              
              {/* 标签筛选 */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">标签:</span>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                        selectedTag === tag
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
          
          {/* 统计 */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              共 {total} 本手册
              {appliedFilters?.q && ` · 搜索: "${appliedFilters.q}"`}
              {appliedFilters?.task_type && ` · 类型: ${appliedFilters.task_type}`}
              {appliedFilters?.tag && ` · 标签: ${appliedFilters.tag}`}
            </span>
          </div>
          
          {/* 手册列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playbooks.length === 0 ? (
              <div className="col-span-full">
                <Card variant="kawaii" className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-pink-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                    暂无手册
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedTaskType !== 'all' || selectedTag
                      ? '尝试调整搜索条件'
                      : '还没有创建任何手册'}
                  </p>
                </Card>
              </div>
            ) : (
              playbooks.map((playbook) => (
                <PlaybookCard
                  key={playbook.id}
                  playbook={playbook}
                  onClick={setSelectedPlaybook}
                />
              ))
            )}
          </div>
        </div>
        
        {/* 详情弹窗 */}
        {selectedPlaybook && (
          <PlaybookDetail
            playbook={selectedPlaybook}
            onClose={() => setSelectedPlaybook(null)}
          />
        )}
        
        {/* 创建表单弹窗（简化版） */}
        {showCreateForm && (
          <CreatePlaybookModal
            onClose={() => setShowCreateForm(false)}
            onCreate={handleCreate}
            isCreating={isCreating}
          />
        )}
      </Layout>
    </ErrorBoundary>
  );
}

// 创建手册弹窗
interface CreatePlaybookModalProps {
  onClose: () => void;
  onCreate: (input: CreatePlaybookInput) => Promise<void>;
  isCreating: boolean;
}

function CreatePlaybookModal({ onClose, onCreate, isCreating }: CreatePlaybookModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [taskType, setTaskType] = useState('code_review');
  const [tags, setTags] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      title,
      body,
      taskType,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card variant="kawaii" className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            新建 Playbook
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入手册标题"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              任务类型
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-[#3D3D5C] bg-white dark:bg-[#1A1A2E]"
            >
              <option value="code_review">Code Review</option>
              <option value="deployment">Deployment</option>
              <option value="analysis">Analysis</option>
              <option value="documentation">Documentation</option>
              <option value="testing">Testing</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标签（用逗号分隔）
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. urgent, frontend, react"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              内容
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="输入手册详细内容..."
              rows={6}
              required
              className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-[#3D3D5C] bg-white dark:bg-[#1A1A2E] resize-none"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="kawaii"
              disabled={isCreating || !title.trim() || !body.trim()}
              className="flex-1"
            >
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function PlaybooksPage() {
  return (
    <ManagementRouteGuard>
      <PlaybooksContent />
    </ManagementRouteGuard>
  );
}
