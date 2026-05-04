import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  badge?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Unified page header used across all management pages.
 *
 * - Badge is rendered only when provided.
 * - Description is rendered only when provided and non-empty.
 * - Actions are right-aligned on desktop, full-width on mobile.
 */
export function PageHeader({ title, badge, description, actions, className }: PageHeaderProps) {
  const hasDesc = typeof description === 'string' && description.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      <div className={cn(badge ? 'space-y-2' : undefined)}>
        {badge ? (
          <div className="hidden items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] sm:inline-flex dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80 dark:text-[var(--kw-dark-primary)]">
            {badge}
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-[var(--kw-text)] sm:text-3xl dark:text-[var(--kw-dark-text)]">
            {title}
          </h1>
          {hasDesc ? (
            <p className="mt-1 hidden text-[var(--kw-text-muted)] sm:block dark:text-[var(--kw-dark-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
