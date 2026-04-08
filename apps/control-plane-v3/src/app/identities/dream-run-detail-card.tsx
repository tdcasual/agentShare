import { Pause, Play } from 'lucide-react';
import type { OpenClawDreamRun } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { formatSnapshotTimestamp } from './components';

export interface DreamRunDetailCardProps {
  run: OpenClawDreamRun;
  canControl: boolean;
  isPausing: boolean;
  isResuming: boolean;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
}

export function DreamRunDetailCard({
  run,
  canControl,
  isPausing,
  isResuming,
  onPause,
  onResume,
}: DreamRunDetailCardProps) {
  return (
    <Card className="border border-sky-100 bg-sky-50/70 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
            Dream run detail
          </p>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
            {run.objective}
          </h2>
          <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            {run.consumed_steps}/{run.step_budget} steps
            {run.stop_reason ? ` · ${run.stop_reason.replaceAll('_', ' ')}` : ''}
          </p>
          <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            Updated {formatSnapshotTimestamp(run.updated_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={run.status === 'active' ? 'info' : 'secondary'}>{run.status}</Badge>
          {canControl && run.status === 'active' ? (
            <Button
              variant="secondary"
              size="sm"
              loading={isPausing}
              onClick={onPause}
              leftIcon={!isPausing ? <Pause className="h-4 w-4" /> : undefined}
            >
              Pause dream run
            </Button>
          ) : null}
          {canControl && run.status === 'paused' ? (
            <Button
              variant="secondary"
              size="sm"
              loading={isResuming}
              onClick={onResume}
              leftIcon={!isResuming ? <Play className="h-4 w-4" /> : undefined}
            >
              Resume dream run
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
