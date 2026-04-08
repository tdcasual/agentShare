import { Badge } from '@/shared/ui-primitives/badge';
import type { OpenClawDreamPolicy } from '@/domains/identity';

export interface DreamPolicyCardProps {
  dreamPolicy: OpenClawDreamPolicy;
}

export function DreamPolicyCard({ dreamPolicy }: DreamPolicyCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
          Dream Mode
        </h3>
        <Badge variant={dreamPolicy.enabled ? 'success' : 'secondary'}>
          {dreamPolicy.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>
      <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
        {dreamPolicy.max_steps_per_run} steps · {dreamPolicy.max_followup_tasks} follow-up
        {dreamPolicy.max_followup_tasks === 1 ? '' : 's'} · max context{' '}
        {dreamPolicy.max_context_tokens}
      </p>
      <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
        Task proposal {dreamPolicy.allow_task_proposal ? 'on' : 'off'} · memory write{' '}
        {dreamPolicy.allow_memory_write ? 'on' : 'off'}
      </p>
    </div>
  );
}
