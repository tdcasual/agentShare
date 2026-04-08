import { Badge } from '@/shared/ui-primitives/badge';
import { formatSnapshotTimestamp } from './components';
import type { OpenClawDreamRun } from '@/domains/identity';

export interface DreamRunListProps {
  runs: OpenClawDreamRun[];
}

export function DreamRunList({ runs }: DreamRunListProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
          Recent Dream Runs
        </h3>
        <Badge variant="secondary">{runs.length}</Badge>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No dream runs recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {runs.slice(0, 3).map((run) => (
            <div
              key={run.id}
              className="rounded-2xl border border-pink-100 bg-white/80 p-3 dark:border-[#3D3D5C] dark:bg-[#252540]/80"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{run.objective}</p>
                <Badge variant={run.status === 'active' ? 'info' : 'secondary'}>{run.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                {run.consumed_steps}/{run.step_budget} steps
                {run.stop_reason ? ` · ${run.stop_reason.replaceAll('_', ' ')}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                Updated {formatSnapshotTimestamp(run.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
