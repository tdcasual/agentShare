/**
 * Spaces Page Components - 可复用的子组件
 */

import { Sparkles, ShieldCheck, Bot, Boxes, Wrench } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white/75 px-4 py-3 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/65">
      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-300">
        {icon}
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-[#E8E8EC]">{value}</p>
    </div>
  );
}

export interface SectionNoticeProps {
  message: string;
}

export function SectionNotice({ message }: SectionNoticeProps) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-600 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]">
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
  return (
    <div className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-[#E8E8EC]">
        {icon}
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">Nothing published yet.</p>
        ) : (
          items.map((item) => (
            <p key={item} className="text-sm text-gray-600 dark:text-[#9CA3AF]">
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
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard
        label="Recent events"
        value={data.events.toString()}
        icon={<Sparkles className="h-4 w-4" />}
      />
      <MetricCard
        label="Pending reviews"
        value={data.pendingReviews.toString()}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <MetricCard
        label="Active agents"
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InventoryCard
        icon={<Boxes className="h-4 w-4" />}
        title="Published assets"
        items={data.assets}
      />
      <InventoryCard
        icon={<Wrench className="h-4 w-4" />}
        title="Published skills"
        items={data.skills}
      />
    </div>
  );
}
