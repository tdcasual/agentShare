/**
 * Spaces Page Components - 可复用的子组件
 */

import { Sparkles, ShieldCheck, Bot, Boxes, Wrench } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="dark:bg-[var(--kw-dark-surface-alt)]/65 rounded-2xl border border-[var(--kw-orange-surface)] bg-white/75 px-4 py-3 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center gap-2 text-[var(--kw-orange-text)] dark:text-[var(--kw-warning)]">
        {icon}
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-[var(--kw-text)]">{value}</p>
    </div>
  );
}

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

export interface MetricData {
  events: number;
  pendingReviews: number;
  activeAgents: number;
}

export function SpacesHeroMetrics({ data }: { data: MetricData }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard
        label={t('spaces.recentEvents')}
        value={data.events.toString()}
        icon={<Sparkles className="h-4 w-4" />}
      />
      <MetricCard
        label={t('spaces.pendingReviews')}
        value={data.pendingReviews.toString()}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <MetricCard
        label={t('spaces.activeAgents')}
        value={data.activeAgents.toString()}
        icon={<Bot className="h-4 w-4" />}
      />
    </div>
  );
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
