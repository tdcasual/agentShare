/**
 * Identity Page Components - 可复用的子组件
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui-primitives/button';

export interface CoverageMetricProps {
  label: string;
  value: string;
  hint: string;
}

export function CoverageMetric({ label, value, hint }: CoverageMetricProps) {
  return (
    <div className="border-[var(--kw-amber-surface)]/80 dark:border-[var(--kw-dark-amber-surface)]/60 dark:bg-[var(--kw-dark-amber-surface)]/10 rounded-2xl border bg-white/70 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)] sm:text-xs sm:tracking-[0.2em]">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)] sm:text-2xl">
        {value}
      </p>
      <p className="text-[var(--kw-amber-text)]/80 dark:text-[var(--kw-warning)]/80 mt-1 text-xs">
        {hint}
      </p>
    </div>
  );
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="dark:bg-[var(--kw-dark-surface)]/60 rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/70 p-6 text-center dark:border-[var(--kw-dark-border)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
        {icon}
      </div>
      <p className="text-sm text-[var(--kw-text-muted)]">{message}</p>
    </div>
  );
}

export interface SectionLoadingProps {
  message: string;
}

export function SectionLoading({ message }: SectionLoadingProps) {
  return (
    <div className="dark:bg-[var(--kw-dark-surface)]/60 rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/70 p-6 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
      {message}
    </div>
  );
}

export interface SectionErrorProps {
  message: string;
  actionLabel: string;
  onRetry: () => Promise<void>;
  isRefreshing: boolean;
}

export function SectionError({ message, actionLabel, onRetry, isRefreshing }: SectionErrorProps) {
  return (
    <div
      role="alert"
      className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 rounded-2xl border border-[var(--kw-rose-surface)] p-4 text-sm text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
    >
      <div className="flex flex-col gap-4">
        <p>{message}</p>
        <div>
          <Button
            variant="secondary"
            size="sm"
            loading={isRefreshing}
            onClick={onRetry}
            leftIcon={!isRefreshing ? <RefreshCw className="h-4 w-4" /> : undefined}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface IdentityDetailsGridProps {
  items: Array<[string, string]>;
}

export function IdentityDetailsGrid({ items }: IdentityDetailsGridProps) {
  return (
    <dl className="dark:bg-[var(--kw-dark-surface-alt)]/60 mt-4 grid gap-3 rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/60 p-4 sm:grid-cols-2 dark:border-[var(--kw-dark-border)]">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-[var(--kw-text-muted)]">{label}</dt>
          <dd className="mt-1 break-all text-sm text-[var(--kw-text)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function formatSnapshotTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export function formatOptionalTimestamp(value: string | undefined, fallback: string) {
  return value ? formatSnapshotTimestamp(value) : fallback;
}
