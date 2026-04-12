/**
 * Spaces Page Components - 可复用的子组件
 */

import { Boxes, Wrench } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export interface SectionNoticeProps {
  message: string;
}

export function SectionNotice({ message }: SectionNoticeProps) {
  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/70 p-4 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
      {message}
    </div>
  );
}

export interface InventoryCardProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

export function InventoryCard({ icon, title, items }: InventoryCardProps) {
  const { t } = useI18n();
  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--kw-text)]">
        {icon}
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--kw-text-muted)]">{t('spaces.nothingPublishedYet')}</p>
        ) : (
          items.map((item) => (
            <p key={item} className="text-sm text-[var(--kw-text-muted)]">
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export interface MarketInventoryData {
  assets: string[];
  skills: string[];
}

export function MarketInventoryPanel({ data }: { data: MarketInventoryData }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InventoryCard
        icon={<Boxes className="h-4 w-4" />}
        title={t('spaces.publishedAssets')}
        items={data.assets}
      />
      <InventoryCard
        icon={<Wrench className="h-4 w-4" />}
        title={t('spaces.publishedSkills')}
        items={data.skills}
      />
    </div>
  );
}
