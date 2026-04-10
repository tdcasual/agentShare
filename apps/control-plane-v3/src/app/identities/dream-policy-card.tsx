import { Badge } from '@/shared/ui-primitives/badge';
import type { OpenClawDreamPolicy } from '@/domains/identity';
import { useI18n } from '@/components/i18n-provider';

export interface DreamPolicyCardProps {
  dreamPolicy: OpenClawDreamPolicy;
}

export function DreamPolicyCard({ dreamPolicy }: DreamPolicyCardProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface-alt)]/60">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
          Dream Mode
        </h3>
        <Badge variant={dreamPolicy.enabled ? 'success' : 'secondary'}>
          {dreamPolicy.enabled ? t('identities.values.enabled') : t('identities.values.disabled')}
        </Badge>
      </div>
      <p className="text-sm text-[var(--kw-text-muted)]">
        {dreamPolicy.max_steps_per_run} steps · {dreamPolicy.max_followup_tasks} follow-up
        {dreamPolicy.max_followup_tasks === 1 ? '' : 's'} · max context{' '}
        {dreamPolicy.max_context_tokens}
      </p>
      <p className="text-sm text-[var(--kw-text-muted)]">
        Task proposal {dreamPolicy.allow_task_proposal ? 'on' : 'off'} · memory write{' '}
        {dreamPolicy.allow_memory_write ? 'on' : 'off'}
      </p>
    </div>
  );
}
