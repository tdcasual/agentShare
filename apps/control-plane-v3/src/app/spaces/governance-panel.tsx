/**
 * Governance Panel Component - 审批治理面板
 */

import { memo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice } from './components';
import type { ReviewItem } from '@/domains/review';
import { useI18n } from '@/components/i18n-provider';

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
  const { t } = useI18n();
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--kw-text)]">
            {t('spaces.governance.title')}
          </h2>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {t('spaces.governance.description')}
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
          {t('spaces.governance.allReviews')}
        </Button>
        <Button
          variant={selectedStatus === 'pending' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedStatus === 'pending'}
          onClick={() => onSelectStatus('pending')}
        >
          {t('spaces.governance.pendingReview')}
        </Button>
        <Button
          variant={selectedStatus === 'rejected' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedStatus === 'rejected'}
          onClick={() => onSelectStatus('rejected')}
        >
          {t('spaces.governance.rejectedReview')}
        </Button>
      </div>

      {isLoading && reviews.length === 0 ? (
        <SectionNotice message={t('spaces.loadingGovernanceQueue')} />
      ) : reviews.length === 0 ? (
        <SectionNotice
          message={
            selectedStatus === 'rejected'
              ? t('spaces.governanceEmptyRejected')
              : selectedStatus === 'all'
                ? t('spaces.governanceEmptyAll')
                : t('spaces.governanceEmptyPending')
          }
        />
      ) : (
        <div className="space-y-2">
          {reviews.slice(0, 4).map((item) => (
            <GovernanceReviewItem
              key={`${item.resource_kind}-${item.resource_id}`}
              item={item}
              actionKey={actionKey}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

interface GovernanceReviewItemProps {
  item: ReviewItem;
  actionKey: string | null;
  onApprove: (resourceKind: string, resourceId: string) => void;
  onReject: (resourceKind: string, resourceId: string) => void;
}

const GovernanceReviewItem = memo(function GovernanceReviewItem({
  item,
  actionKey,
  onApprove,
  onReject,
}: GovernanceReviewItemProps) {
  const { t } = useI18n();
  const isRejecting = actionKey === `reject:${item.resource_kind}:${item.resource_id}`;
  const isApproving = actionKey === `approve:${item.resource_kind}:${item.resource_id}`;

  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[var(--kw-text)]">{item.title}</p>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {item.resource_kind} · submitted by {item.created_by_actor_id ?? 'unknown-agent'}
          </p>
        </div>
        {item.publication_status === 'pending_review' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={isRejecting}
              onClick={() => onReject(item.resource_kind, item.resource_id)}
              leftIcon={!isRejecting ? <XCircle className="h-4 w-4" /> : undefined}
            >
              {t('spaces.governance.reject').replace('{title}', item.title)}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={isApproving}
              onClick={() => onApprove(item.resource_kind, item.resource_id)}
              leftIcon={!isApproving ? <CheckCircle2 className="h-4 w-4" /> : undefined}
            >
              {t('spaces.governance.approve').replace('{title}', item.title)}
            </Button>
          </div>
        ) : (
          <Badge variant="secondary">{item.publication_status}</Badge>
        )}
      </div>
    </div>
  );
});
