import * as React from 'react';
import { Card } from './card';

export interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  variant?: 'default' | 'review' | 'marketplace' | 'space' | 'identity' | 'asset';
}

export function MetricCard({ label, value, icon, hint, variant = 'default' }: MetricCardProps) {
  switch (variant) {
    case 'review':
      return (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-2 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center gap-2">
            {icon}
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {label}
            </p>
          </div>
          <p className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {value}
          </p>
        </Card>
      );

    case 'marketplace':
      return (
        <div className="dark:bg-[var(--kw-dark-bg)]/65 rounded-2xl border border-[var(--kw-border)] bg-white/75 px-4 py-3 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center gap-2 text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
            {icon}
            <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {value}
          </p>
        </div>
      );

    case 'space':
      return (
        <div className="dark:bg-[var(--kw-dark-surface-alt)]/65 rounded-2xl border border-[var(--kw-orange-surface)] bg-white/75 px-4 py-3 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center gap-2 text-[var(--kw-orange-text)] dark:text-[var(--kw-warning)]">
            {icon}
            <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-[var(--kw-text)]">{value}</p>
        </div>
      );

    case 'identity':
      return (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-2 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <p className="text-sm text-[var(--kw-text-muted)]">{label}</p>
          <p className="text-3xl font-bold text-[var(--kw-text)]">{value}</p>
          <p className="text-xs text-[var(--kw-text-muted)]">{hint}</p>
        </Card>
      );

    case 'asset':
      return (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="space-y-2">
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {label}
            </p>
            <p className="text-3xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {value}
            </p>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {hint}
            </p>
          </div>
        </Card>
      );

    case 'default':
    default:
      return (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-2 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {label}
          </p>
          <p className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {value}
          </p>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {hint}
          </p>
        </Card>
      );
  }
}
