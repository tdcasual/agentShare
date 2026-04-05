/**
 * Governance Panel Component - 审批治理面板
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice } from './components';
import type { ReviewItem } from '@/domains/review';

export interface GovernancePanelProps {
  reviews: ReviewItem[];
  isLoading: boolean;
  selectedStatus: 'all' | 'pending' | 'rejected';
  actionKey: string | null;
  onSelectStatus: (status: 'all' | 'pending' | 'rejected') => void;
  onApprove: (resourceKind: string, resourceId: string) => void;
  onReject: (resourceKind: string, resourceId: string) => void;
}

export function GovernancePanel({
  reviews,
  isLoading,
  selectedStatus,
  actionKey,
  onSelectStatus,
  onApprove,
  onReject,
}: GovernancePanelProps) {
  return (
    <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Governance Space</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
            Human review backlog for agent-originated market submissions.
          </p>
        </div>
        <Badge variant={selectedStatus === 'rejected' ? 'secondary' : 'warning'}>
          {reviews.length}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedStatus === 'all' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedStatus === 'all'}
          onClick={() => onSelectStatus('all')}
        >
          All reviews
        </Button>
        <Button
          variant={selectedStatus === 'pending' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedStatus === 'pending'}
          onClick={() => onSelectStatus('pending')}
        >
          Pending Review
        </Button>
        <Button
          variant={selectedStatus === 'rejected' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedStatus === 'rejected'}
          onClick={() => onSelectStatus('rejected')}
        >
          Rejected Review
        </Button>
      </div>

      {isLoading && reviews.length === 0 ? (
        <SectionNotice message="Loading governance queue..." />
      ) : reviews.length === 0 ? (
        <SectionNotice
          message={
            selectedStatus === 'rejected'
              ? 'No rejected submissions are visible right now.'
              : selectedStatus === 'all'
                ? 'No review items are visible right now.'
                : 'No submissions are waiting for governance review.'
          }
        />
      ) : (
        <div className="space-y-2">
          {reviews.slice(0, 4).map((item) => (
            <div 
              key={`${item.resource_kind}-${item.resource_id}`} 
              className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {item.resource_kind} · submitted by {item.created_by_actor_id ?? 'unknown-agent'}
                  </p>
                </div>
                {item.publication_status === 'pending_review' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={actionKey === `reject:${item.resource_kind}:${item.resource_id}`}
                      onClick={() => onReject(item.resource_kind, item.resource_id)}
                      leftIcon={
                        actionKey !== `reject:${item.resource_kind}:${item.resource_id}`
                          ? <XCircle className="h-4 w-4" />
                          : undefined
                      }
                    >
                      Reject {item.title}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={actionKey === `approve:${item.resource_kind}:${item.resource_id}`}
                      onClick={() => onApprove(item.resource_kind, item.resource_id)}
                      leftIcon={
                        actionKey !== `approve:${item.resource_kind}:${item.resource_id}`
                          ? <CheckCircle2 className="h-4 w-4" />
                          : undefined
                      }
                    >
                      Approve {item.title}
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary">{item.publication_status}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
