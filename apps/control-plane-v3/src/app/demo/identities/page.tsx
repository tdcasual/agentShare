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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--kw-primary-200)] border-t-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card
        role="alert"
        aria-live="assertive"
        className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
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
          <h1 className="text-3xl font-bold text-[var(--kw-text)]">
            {t('identities.title')}
          </h1>
          <p className="mt-1 text-[var(--kw-text-muted)]">{t('identities.description')}</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('identities.createIdentity')}
        </Button>
      </div>

      <Card className="border border-amber-200 bg-[var(--kw-amber-surface)]/80 dark:border-[var(--kw-dark-amber-surface)] dark:bg-amber-900/10">
        <div className="space-y-2 p-4">
          <p className="text-sm font-medium text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
            Identity interaction sandbox
          </p>
          <p className="text-sm text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
            Use this page to demo identity cards, filtering, and create flows with fixture data. It
            is not the live management roster.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-[var(--kw-warning)] dark:hover:bg-amber-900/50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sandbox Directory
            </Link>
            <Link
              href="/identities"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--kw-sky-surface)]">
            <Users className="h-6 w-6 text-[var(--kw-sky-text)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--kw-text)]">{humans.length}</p>
            <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.humans')}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--kw-green-surface)]">
            <Bot className="h-6 w-6 text-[var(--kw-green-text)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--kw-text)]">{agents.length}</p>
            <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.agents')}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--kw-primary-100)]">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--kw-text)]">
              {identities.length}
            </p>
            <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.total')}</p>
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
          <div className="flex rounded-full border border-[var(--kw-primary-200)] bg-white p-1">
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
          <div className="flex rounded-full border border-[var(--kw-primary-200)] bg-white p-1">
            <button
              onClick={() => setViewMode('grid')}
              aria-label={t('identities.gridView')}
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-pink-400',
                viewMode === 'grid'
                  ? 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)]'
                  : 'text-[var(--kw-text-muted)] hover:text-[var(--kw-text-muted)]'
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
                  ? 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)]'
                  : 'text-[var(--kw-text-muted)] hover:text-[var(--kw-text-muted)]'
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="mb-4 text-sm text-[var(--kw-text-muted)]">
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
            <div className="divide-y divide-[var(--kw-border)]">
              {filteredIdentities.map((identity) => (
                <div
                  key={identity.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--kw-primary-50)]/30"
                >
                  <Image
                    src={identity.profile.avatar}
                    alt={identity.profile.name}
                    width={48}
                    height={48}
                    sizes="48px"
                    className={cn(
                      'h-12 w-12 rounded-full border-2 object-cover',
                      identity.type === 'human' ? 'border-[var(--kw-human-accent)]' : 'border-[var(--kw-agent-accent)]'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--kw-text)]">
                        {identity.profile.name}
                      </h3>
                      <Badge variant={identity.type === 'human' ? 'human' : 'agent'}>
                        {identity.type === 'human'
                          ? t('identities.type.human')
                          : t('identities.type.agent')}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-[var(--kw-text-muted)]">
                      {identity.profile.bio}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        identity.presence === 'online'
                          ? 'bg-[var(--kw-agent-accent)]'
                          : identity.presence === 'away'
                            ? 'bg-[var(--kw-warning)]'
                            : identity.presence === 'busy'
                              ? 'bg-[var(--kw-error)]'
                              : 'bg-[var(--kw-text-muted)]'
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
            className="rounded-2xl border-2 border-sky-200 bg-[var(--kw-sky-surface)]/50 p-6 text-center transition-colors hover:bg-[var(--kw-sky-surface)]"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-sky-surface)]">
              <Users className="h-8 w-8 text-[var(--kw-sky-text)]" />
            </div>
            <h3 className="mb-1 font-semibold text-[var(--kw-text)]">
              {t('identities.type.human')}
            </h3>
            <p className="text-sm text-[var(--kw-text-muted)]">
              {t('identities.createHumanDesc')}
            </p>
          </button>
          <button
            onClick={() => setShowCreateModal(false)}
            className="rounded-2xl border-2 border-green-200 bg-[var(--kw-green-surface)]/50 p-6 text-center transition-colors hover:bg-[var(--kw-green-surface)]"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-green-surface)]">
              <Bot className="h-8 w-8 text-[var(--kw-green-text)]" />
            </div>
            <h3 className="mb-1 font-semibold text-[var(--kw-text)]">
              {t('identities.type.agent')}
            </h3>
            <p className="text-sm text-[var(--kw-text-muted)]">
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
        active ? 'bg-[var(--kw-primary-500)] text-white' : 'text-[var(--kw-text-muted)] hover:bg-[var(--kw-primary-50)] dark:text-[var(--kw-dark-text-muted)]'
      )}
    >
      {label} ({count})
    </button>
  );
});
