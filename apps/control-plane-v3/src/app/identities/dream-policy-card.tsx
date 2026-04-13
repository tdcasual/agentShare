import { Badge } from '@/shared/ui-primitives/badge';
import type { OpenClawDreamPolicy } from '@/domains/identity';
import { useI18n } from '@/components/i18n-provider';

export interface DreamPolicyCardProps {
  dreamPolicy: OpenClawDreamPolicy;
}

export function DreamPolicyCard({ dreamPolicy }: DreamPolicyCardProps) {
  const { t } = useI18n();
  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/60 space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
          {t('identities.sections.dreamModeTitle')}
        </h3>
        <Badge variant={dreamPolicy.enabled ? 'success' : 'secondary'}>
          {dreamPolicy.enabled ? t('identities.values.enabled') : t('identities.values.disabled')}
        </Badge>
      </div>
      <p className="text-sm text-[var(--kw-text-muted)]">
        {t('identities.sections.dreamModeSummary', {
          steps: dreamPolicy.max_steps_per_run,
          followUps: dreamPolicy.max_followup_tasks,
          suffix: dreamPolicy.max_followup_tasks === 1 ? '' : 's',
          maxContext: dreamPolicy.max_context_tokens,
        })}
      </p>
      <p className="text-sm text-[var(--kw-text-muted)]">
        {t('identities.sections.dreamModeToggles', {
          proposalState: dreamPolicy.allow_task_proposal
            ? t('identities.values.on')
            : t('identities.values.off'),
          memoryState: dreamPolicy.allow_memory_write
            ? t('identities.values.on')
            : t('identities.values.off'),
        })}
      </p>
    </div>
  );
}
