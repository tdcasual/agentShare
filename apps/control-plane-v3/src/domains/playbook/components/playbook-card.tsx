/**
 * Playbook Card - 手册卡片组件
 *
 * Kawaii风格，显示手册信息和标签
 */

'use client';

import { Card } from '@/shared/ui-primitives/card';

import type { Playbook } from '../types';
import { BookOpen, Tag, Shield } from 'lucide-react';

interface PlaybookCardProps {
  playbook: Playbook;
  onClick?: (playbook: Playbook) => void;
}

// 标签颜色映射
const tagColors: Record<string, string> = {
  default: 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)]',
  urgent: 'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:bg-[var(--kw-dark-error-surface)]/30 dark:text-[var(--kw-error)]',
  important: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] dark:bg-[var(--kw-dark-amber-surface)]/30 dark:text-[var(--kw-warning)]',
  review: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] dark:bg-[var(--kw-dark-amber-surface)]/30 dark:text-[var(--kw-warning)]',
  approved: 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-success-surface)]/30 dark:text-[var(--kw-dark-mint)]',
};

export function PlaybookCard({ playbook, onClick }: PlaybookCardProps) {
  // 截断正文预览
  const bodyPreview =
    playbook.body.length > 120 ? playbook.body.slice(0, 120) + '...' : playbook.body;

  return (
    <Card
      variant="kawaii"
      hover={!!onClick}
      onClick={() => onClick?.(playbook)}
      className="cursor-pointer"
    >
      {/* 头部：图标和类型 */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-purple-text)] text-white">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-semibold text-[var(--kw-text)]">
            {playbook.title}
          </h3>
          <p className="text-xs text-[var(--kw-text-muted)]">{playbook.taskType}</p>
        </div>
      </div>

      {/* 正文预览 */}
      <p className="mb-4 line-clamp-3 text-sm text-[var(--kw-text-muted)]">{bodyPreview}</p>

      {/* 标签 */}
      {playbook.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {playbook.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                tagColors[tag] || tagColors.default
              }`}
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
          {playbook.tags.length > 5 && (
            <span className="text-xs text-[var(--kw-text-muted)]">+{playbook.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between border-t border-[var(--kw-border)]/50 pt-3 text-xs text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-text-muted)]">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span className="max-w-[min(100px,25vw)] truncate">{playbook.publicationStatus}</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          <span>{playbook.taskType}</span>
        </div>
      </div>
    </Card>
  );
}
