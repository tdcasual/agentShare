/**
 * Playbooks Page - 手册管理页面
 *
 * viewer+ 角色可访问（后端只要求任意 management session）
 * 支持搜索、筛选、查看详情
 */

'use client';

import { useId, useState, useMemo, memo } from 'react';
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
import { usePlaybooks, useCreatePlaybook } from '@/domains/playbook/hooks';
import { PlaybookCard } from '@/domains/playbook/components/playbook-card';
import { PlaybookDetail } from '@/domains/playbook/components/playbook-detail';
import type { Playbook, CreatePlaybookInput, PlaybookSearchQuery } from '@/domains/playbook/types';
import { BookOpen, Search, Plus, Tag, RefreshCw, XCircle, Filter } from 'lucide-react';

// 常见任务类型
const TASK_TYPES = ['all', 'code_review', 'deployment', 'analysis', 'documentation', 'testing'];

function getPlaybookTaskTypeLabel(taskType: string, t: (key: string) => string): string {
  if (taskType === 'all') {
    return t('common.all');
  }

  const normalizedTaskType = taskType === 'code_review' ? 'codeReview' : taskType;
  return t(`playbooks.taskTypes.${normalizedTaskType}`);
}

const PlaybooksContent = memo(function PlaybooksContent() {
  const { t } = useI18n();
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

  const { playbooks, total, appliedFilters, isLoading, error, refresh } = usePlaybooks(query);

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
    playbooks.forEach((p) => p.tags.forEach((t) => tags.add(t)));
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
      setActionError(
        actionError instanceof Error ? actionError.message : t('playbooks.createFailed')
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
        refreshFailure instanceof Error ? refreshFailure.message : t('playbooks.refreshFailed')
      );
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <Layout>
        <PageLoader message={t('playbooks.loading')} />
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
            <h2 className="mb-2 text-xl font-bold text-[var(--kw-text)]">{t('playbooks.loadFailed')}</h2>
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
            <ManagementSessionExpiredAlert message={t('playbooks.sessionExpired')} />
          ) : null}

          {!shouldShowSessionExpired && shouldShowForbidden ? (
            <ManagementForbiddenAlert message={t('playbooks.sessionForbidden')} />
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
                {t('playbooks.title')}
              </h1>
              <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
                {t('playbooks.description')}
              </p>
            </div>
            <div className="flex gap-2">
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
              <Button
                variant="kawaii"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                {t('common.new')}
              </Button>
            </div>
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

          {/* 搜索和筛选 */}
          <Card variant="default" className="p-4">
            <div className="space-y-4">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--kw-text-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('playbooks.searchPlaceholder')}
                  className="pl-10"
                />
              </div>

              {/* 任务类型筛选 */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-[var(--kw-text-muted)]" />
                <span className="text-sm text-[var(--kw-text-muted)]">{t('playbooks.typeFilter')}</span>
                {TASK_TYPES.map((type) => (
                  <TaskTypeFilterButton
                    key={type}
                    type={type}
                    selected={selectedTaskType === type}
                    onSelect={setSelectedTaskType}
                  />
                ))}
              </div>

              {/* 标签筛选 */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4 text-[var(--kw-text-muted)]" />
                  <span className="text-sm text-[var(--kw-text-muted)]">{t('playbooks.tagFilter')}</span>
                  {allTags.map((tag) => (
                    <TagFilterButton
                      key={tag}
                      tag={tag}
                      selected={selectedTag === tag}
                      onToggle={setSelectedTag}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* 统计 */}
          <div className="flex items-center justify-between text-sm text-[var(--kw-text-muted)]">
            <span>
              {t('playbooks.totalCount').replace('{count}', String(total))}
              {appliedFilters?.q && ` · ${t('playbooks.searchPrefix')}: "${appliedFilters.q}"`}
              {appliedFilters?.task_type &&
                ` · ${t('playbooks.typePrefix')}: ${getPlaybookTaskTypeLabel(appliedFilters.task_type, t)}`}
              {appliedFilters?.tag && ` · ${t('playbooks.tagPrefix')}: ${appliedFilters.tag}`}
            </span>
          </div>

          {/* 手册列表 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {playbooks.length === 0 ? (
              <div className="col-span-full">
                <Card variant="kawaii" className="p-12 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-primary-100)]">
                    <BookOpen className="h-10 w-10 text-[var(--kw-primary-500)]" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
                    {t('playbooks.emptyTitle')}
                  </h3>
                  <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-text-muted)]">
                    {searchQuery || selectedTaskType !== 'all' || selectedTag
                      ? t('playbooks.emptyDescFilter')
                      : t('playbooks.emptyDescNoData')}
                  </p>
                </Card>
              </div>
            ) : (
              playbooks.map((playbook) => (
                <PlaybookCard key={playbook.id} playbook={playbook} onClick={setSelectedPlaybook} />
              ))
            )}
          </div>
        </div>

        {/* 详情弹窗 */}
        {selectedPlaybook && (
          <PlaybookDetail playbook={selectedPlaybook} onClose={() => setSelectedPlaybook(null)} />
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
});

// 创建手册弹窗
interface CreatePlaybookModalProps {
  onClose: () => void;
  onCreate: (input: CreatePlaybookInput) => Promise<void>;
  isCreating: boolean;
}

function CreatePlaybookModal({ onClose, onCreate, isCreating }: CreatePlaybookModalProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [taskType, setTaskType] = useState('code_review');
  const [tags, setTags] = useState('');
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const taskTypeId = `${idPrefix}-taskType`;
  const tagsId = `${idPrefix}-tags`;
  const bodyId = `${idPrefix}-body`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      title,
      body,
      taskType,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card variant="kawaii" className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 className="text-xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]">
            {t('playbooks.modal.title')}
          </h2>

          <div>
            <label htmlFor={titleId} className="mb-1 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-border)]">
              {t('tasks.form.title')}
            </label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('playbooks.modal.titlePlaceholder')}
              required
            />
          </div>

          <div>
            <label htmlFor={taskTypeId} className="mb-1 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-border)]">
              {t('tasks.form.taskType')}
            </label>
            <select
              id={taskTypeId}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-xl border border-[var(--kw-primary-200)] bg-white px-3 py-2 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]"
            >
              <option value="code_review">{t('playbooks.taskTypes.codeReview')}</option>
              <option value="deployment">{t('playbooks.taskTypes.deployment')}</option>
              <option value="analysis">{t('playbooks.taskTypes.analysis')}</option>
              <option value="documentation">{t('playbooks.taskTypes.documentation')}</option>
              <option value="testing">{t('playbooks.taskTypes.testing')}</option>
            </select>
          </div>

          <div>
            <label htmlFor={tagsId} className="mb-1 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-border)]">
              {t('playbooks.modal.tagsLabel')}
            </label>
            <Input
              id={tagsId}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('playbooks.form.tagsPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor={bodyId} className="mb-1 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-border)]">
              {t('playbooks.modal.bodyLabel')}
            </label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('playbooks.modal.bodyPlaceholder')}
              rows={6}
              required
              className="w-full resize-none rounded-xl border border-[var(--kw-primary-200)] bg-white px-3 py-2 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]"
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="kawaii"
              disabled={isCreating || !title.trim() || !body.trim()}
              className="flex-1"
            >
              {isCreating ? t('playbooks.modal.creating') : t('common.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

interface TaskTypeFilterButtonProps {
  type: string;
  selected: boolean;
  onSelect: (type: string) => void;
}

const TaskTypeFilterButton = memo(function TaskTypeFilterButton({
  type,
  selected,
  onSelect,
}: TaskTypeFilterButtonProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        selected
          ? 'bg-[var(--kw-primary-100)] font-medium text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)]'
          : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-text-muted)]'
      }`}
    >
      {getPlaybookTaskTypeLabel(type, t)}
    </button>
  );
});

interface TagFilterButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}

const TagFilterButton = memo(function TagFilterButton({ tag, selected, onToggle }: TagFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(selected ? '' : tag)}
      className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
        selected
          ? 'dark:bg-[var(--kw-dark-purple-surface)]/30 bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)] dark:text-[var(--kw-dark-primary)]'
          : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] hover:bg-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-text-muted)]'
      }`}
    >
      {tag}
    </button>
  );
});

export default function PlaybooksPage() {
  return (
    <ManagementRouteGuard>
      <PlaybooksContent />
    </ManagementRouteGuard>
  );
}
