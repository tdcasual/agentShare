'use client';

import Link from 'next/link';
import { useState, useMemo, memo } from 'react';
import Image from 'next/image';
import { useMockIdentities } from '@/hooks/use-identity';
import { IdentityCard } from '@/domains/identity/components/identity-card';
import { Input } from '@/shared/ui-primitives/input';
import { Button } from '@/shared/ui-primitives/button';
import { Badge } from '@/shared/ui-primitives/badge';
import { Modal } from '@/shared/ui-primitives/modal';
import { Card } from '@/shared/ui-primitives/card';
import { useI18n } from '@/components/i18n-provider';
import { Search, Plus, Grid, List, Users, Bot, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Identity } from '@/shared/types';

const demoIdentities: Identity[] = [
  {
    id: 'demo-human-1',
    type: 'human',
    profile: {
      name: 'Demo Operator',
      avatar: '',
      bio: 'Demonstration user',
      tags: ['demo'],
      createdAt: new Date(),
    },
    presence: 'online',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'demo-agent-1',
    type: 'agent',
    profile: {
      name: 'Demo Agent',
      avatar: '',
      bio: 'Demonstration agent',
      tags: ['demo'],
      createdAt: new Date(),
    },
    presence: 'offline',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function DemoIdentitiesPage() {
  return <IdentitiesContent />;
}

function IdentitiesContent() {
  const { t } = useI18n();
  // 使用演示数据
  const { identities, isLoading, error } = useMockIdentities({
    identities: demoIdentities,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'human' | 'agent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 使用 useMemo 进行筛选，避免重复计算
  const filteredIdentities = useMemo(() => {
    let filtered = identities;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.profile.name.toLowerCase().includes(query) ||
          i.profile.bio?.toLowerCase().includes(query) ||
          i.profile.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((i) => i.type === typeFilter);
    }

    return filtered;
  }, [searchQuery, typeFilter, identities]);

  const humans = useMemo(() => identities.filter((i) => i.type === 'human'), [identities]);
  const agents = useMemo(() => identities.filter((i) => i.type === 'agent'), [identities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card
        role="alert"
        aria-live="assertive"
        className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
      >
        {error.message}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
            {t('identities.title')}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">{t('identities.description')}</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('identities.createIdentity')}
        </Button>
      </div>

      <Card className="border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-900/10">
        <div className="space-y-2 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Identity interaction sandbox
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Use this page to demo identity cards, filtering, and create flows with fixture data. It
            is not the live management roster.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sandbox Directory
            </Link>
            <Link
              href="/identities"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-[#252540] dark:text-stone-100 dark:hover:bg-[#2A2A45]"
            >
              View live identities
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
            <Users className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">{humans.length}</p>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{t('identities.humans')}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <Bot className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">{agents.length}</p>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{t('identities.agents')}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {identities.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{t('identities.total')}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <Input
            placeholder={t('identities.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-pink-200 bg-white p-1">
            <FilterButton
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
              label={t('common.all')}
              count={identities.length}
            />
            <FilterButton
              active={typeFilter === 'human'}
              onClick={() => setTypeFilter('human')}
              label={t('identities.humans')}
              count={humans.length}
            />
            <FilterButton
              active={typeFilter === 'agent'}
              onClick={() => setTypeFilter('agent')}
              label={t('identities.agents')}
              count={agents.length}
            />
          </div>
          <div className="flex rounded-full border border-pink-200 bg-white p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label={t('identities.gridView')}
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-pink-400',
                viewMode === 'grid'
                  ? 'bg-pink-100 text-pink-600'
                  : 'text-gray-400 hover:text-gray-600 dark:text-[#9CA3AF]'
              )}
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label={t('identities.listView')}
              aria-pressed={viewMode === 'list'}
              className={cn(
                'rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-pink-400',
                viewMode === 'list'
                  ? 'bg-pink-100 text-pink-600'
                  : 'text-gray-400 hover:text-gray-600 dark:text-[#9CA3AF]'
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="mb-4 text-sm text-gray-500 dark:text-[#9CA3AF]">
          {t('identities.showing')} {filteredIdentities.length} {t('identities.of')}{' '}
          {identities.length} {t('identities.identities')}
        </p>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIdentities.map((identity, index) => (
              <div
                key={identity.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <IdentityCard identity={identity} />
              </div>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-pink-100">
              {filteredIdentities.map((identity) => (
                <div
                  key={identity.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-pink-50/30"
                >
                  <Image
                    src={identity.profile.avatar}
                    alt={identity.profile.name}
                    width={48}
                    height={48}
                    sizes="48px"
                    className={cn(
                      'h-12 w-12 rounded-full border-2 object-cover',
                      identity.type === 'human' ? 'border-sky-300' : 'border-green-300'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                        {identity.profile.name}
                      </h3>
                      <Badge variant={identity.type === 'human' ? 'human' : 'agent'}>
                        {identity.type === 'human'
                          ? t('identities.type.human')
                          : t('identities.type.agent')}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {identity.profile.bio}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        identity.presence === 'online'
                          ? 'bg-green-400'
                          : identity.presence === 'away'
                            ? 'bg-yellow-400'
                            : identity.presence === 'busy'
                              ? 'bg-red-400'
                              : 'bg-gray-300'
                      )}
                    />
                    <Button variant="ghost" size="sm">
                      {t('common.view')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('identities.createIdentity')}
        description={t('identities.chooseType')}
      >
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowCreateModal(false)}
            className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-6 text-center transition-colors hover:bg-sky-100"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
              <Users className="h-8 w-8 text-sky-600" />
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('identities.type.human')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              {t('identities.createHumanDesc')}
            </p>
          </button>
          <button
            onClick={() => setShowCreateModal(false)}
            className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-6 text-center transition-colors hover:bg-green-100"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Bot className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('identities.type.agent')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              {t('identities.createAgentDesc')}
            </p>
          </button>
        </div>
      </Modal>
    </div>
  );
}

const FilterButton = memo(function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-pink-500 text-white' : 'text-gray-600 hover:bg-pink-50 dark:text-[#9CA3AF]'
      )}
    >
      {label} ({count})
    </button>
  );
});
