/**
 * Identity Page Components - 可复用的子组件
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';

export interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{label}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
      <p className="text-xs text-gray-400 dark:text-[#9CA3AF]">{hint}</p>
    </Card>
  );
}

export interface CoverageMetricProps {
  label: string;
  value: string;
  hint: string;
}

export function CoverageMetric({ label, value, hint }: CoverageMetricProps) {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white/70 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">{value}</p>
      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">{hint}</p>
    </div>
  );
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-6 text-center dark:border-[#3D3D5C] dark:bg-[#252540]/60">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]">
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">{message}</p>
    </div>
  );
}

export interface SectionLoadingProps {
  message: string;
}

export function SectionLoading({ message }: SectionLoadingProps) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-6 text-sm text-gray-600 dark:border-[#3D3D5C] dark:bg-[#252540]/60 dark:text-[#9CA3AF]">
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
      className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
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
    <dl className="mt-4 grid gap-3 rounded-2xl border border-dashed border-pink-100 bg-white/60 p-4 sm:grid-cols-2 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-gray-400 dark:text-[#9CA3AF]">
            {label}
          </dt>
          <dd className="mt-1 break-all text-sm text-gray-700 dark:text-[#E8E8EC]">{value}</dd>
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
