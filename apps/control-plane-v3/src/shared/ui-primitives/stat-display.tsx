interface StatDisplayProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

/**
 * Icon + label + value stat block used in token cards and review items.
 */
export function StatDisplay({ icon, label, value }: StatDisplayProps) {
  return (
    <div className="bg-[var(--kw-primary-50)]/40 dark:bg-[var(--kw-dark-bg)]/60 rounded-2xl border border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center gap-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-all text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </div>
  );
}
