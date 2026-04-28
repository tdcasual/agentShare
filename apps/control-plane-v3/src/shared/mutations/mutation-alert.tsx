'use client';

import { cn } from '@/lib/utils';

export function MutationAlert({
  error,
  success,
  className,
}: {
  error: string | null;
  success: string | null;
  className?: string;
}) {
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={cn(
          'dark:bg-[var(--kw-dark-error-surface)]/20 rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)] dark:text-[var(--kw-error)]',
          className
        )}
      >
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'border-[var(--kw-success)]/30 bg-[var(--kw-success)]/10 rounded-2xl border px-4 py-3 text-sm text-[var(--kw-success)]',
          className
        )}
      >
        {success}
      </div>
    );
  }

  return null;
}
