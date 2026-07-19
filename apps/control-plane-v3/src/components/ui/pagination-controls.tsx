'use client';

import { Button } from './button';
import { useI18n } from '@/components/i18n-provider';

export function PaginationControls({
  offset,
  limit,
  total,
  onOffsetChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
}) {
  const { t } = useI18n();
  if (total <= limit && offset === 0) {
    return null;
  }
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  return (
    <nav
      aria-label={t('common.pagination')}
      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-sm text-muted-foreground">
        {start}–{end} {t('common.of')} {total}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          {t('common.previous')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={offset + limit >= total}
          onClick={() => onOffsetChange(offset + limit)}
        >
          {t('common.next')}
        </Button>
      </div>
    </nav>
  );
}
