import { Badge } from '@/shared/ui-primitives/badge';
import { useI18n } from '@/components/i18n-provider';
import { translateDreamRunStatus } from '@/lib/enum-labels';
import { formatSnapshotTimestamp } from './components';
import type { OpenClawDreamRun } from '@/domains/identity';

export interface DreamRunListProps {
  runs: OpenClawDreamRun[];
  onSelectRun?: (runId: string) => void;
}

export function DreamRunList({ runs, onSelectRun }: DreamRunListProps) {
  const { t } = useI18n();

  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/60 space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
          {t('identities.sections.recentDreamRunsTitle')}
        </h3>
        <Badge variant="secondary">{runs.length}</Badge>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-[var(--kw-text-muted)]">
          {t('identities.sections.noDreamRuns')}
        </p>
      ) : (
        <div className="space-y-2">
          {runs.slice(0, 3).map((run) => (
            <div
              key={run.id}
              className="dark:bg-[var(--kw-dark-surface)]/80 rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-[var(--kw-text)]">{run.objective}</p>
                <Badge variant={run.status === 'active' ? 'info' : 'secondary'}>
                  {translateDreamRunStatus(t, run.status)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                {t('identities.sections.dreamRunSteps', {
                  consumed: run.consumed_steps,
                  budget: run.step_budget,
                })}
                {run.stop_reason ? ` · ${run.stop_reason.replaceAll('_', ' ')}` : ''}
              </p>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                {t('identities.sections.updatedAt', {
                  value: formatSnapshotTimestamp(run.updated_at),
                })}
              </p>
              {onSelectRun ? (
                <button
                  type="button"
                  onClick={() => onSelectRun(run.id)}
                  className="mt-2 text-sm font-medium text-[var(--kw-primary-600)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)] dark:hover:text-[var(--kw-dark-primary)]"
                >
                  {t('identities.sections.viewRunDetail')}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
