'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = {
  default:
    'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] border border-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:border-[var(--kw-dark-border)]',
  primary:
    'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] border border-[var(--kw-primary-200)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)] dark:border-[var(--kw-dark-pink-surface)]',
  secondary:
    'bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)] border border-[var(--kw-purple-surface)] dark:bg-[var(--kw-dark-purple-surface)] dark:text-[var(--kw-dark-primary)] dark:border-[var(--kw-dark-purple-surface)]',
  success:
    'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] border border-[var(--kw-agent-accent)]/40 dark:bg-[var(--kw-dark-success-surface)] dark:text-[var(--kw-dark-mint)] dark:border-[var(--kw-dark-success-surface)]',
  warning:
    'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] border border-[var(--kw-warning)]/40 dark:bg-[var(--kw-dark-warning-surface)] dark:text-[var(--kw-warning)] dark:border-[var(--kw-dark-warning-surface)]',
  error:
    'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] border border-[var(--kw-error)] dark:bg-[var(--kw-dark-error-surface)] dark:text-[var(--kw-error)] dark:border-[var(--kw-dark-error-surface)]',
  info: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] border border-[var(--kw-sky-surface)] dark:bg-[var(--kw-dark-info-surface)] dark:text-[var(--kw-dark-sky)] dark:border-[var(--kw-dark-info-surface)]',
  // Identity-specific
  human:
    'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] border border-[var(--kw-human-accent)]/40 dark:bg-[var(--kw-dark-info-surface)] dark:text-[var(--kw-dark-sky)] dark:border-[var(--kw-dark-info-surface)]',
  agent:
    'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] border border-[var(--kw-agent-accent)]/40 dark:bg-[var(--kw-dark-success-surface)] dark:text-[var(--kw-dark-mint)] dark:border-[var(--kw-dark-success-surface)]',
  // Status
  online:
    'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] border border-[var(--kw-agent-accent)]/40 dark:bg-[var(--kw-dark-success-surface)] dark:text-[var(--kw-dark-mint)] dark:border-[var(--kw-dark-success-surface)]',
  offline:
    'bg-[var(--kw-surface-alt)] text-[var(--kw-text-muted)] border border-[var(--kw-border)] dark:bg-[var(--kw-dark-surface-alt)] dark:border-[var(--kw-dark-border)]',
  away: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] border border-[var(--kw-orange-surface)] dark:bg-[var(--kw-dark-warning-surface)] dark:text-[var(--kw-warning)] dark:border-[var(--kw-dark-warning-surface)]',
  busy: 'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] border border-[var(--kw-error)] dark:bg-[var(--kw-dark-error-surface)] dark:text-[var(--kw-error)] dark:border-[var(--kw-dark-error-surface)]',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
