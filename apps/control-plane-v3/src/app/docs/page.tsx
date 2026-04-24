'use client';

import { useMemo, useState, memo } from 'react';
import { BookOpen, FileText, RefreshCw, Search } from 'lucide-react';
import { usePublicDocs, usePublicDoc, refreshPublicDocs } from '@/domains/docs';
import { Layout } from '@/interfaces/human/layout';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { Modal } from '@/shared/ui-primitives/modal';
import { useI18n } from '@/components/i18n-provider';

const DocsContent = memo(function DocsContent() {
  const { t } = useI18n();
  const docsQuery = usePublicDocs();
  const [selectedDoc, setSelectedDoc] = useState<{ category: string; filename: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(docsQuery.error);

  const docDetailQuery = usePublicDoc(selectedDoc?.category ?? null, selectedDoc?.filename ?? null);

  const docs = docsQuery.docs;
  const categories = useMemo(() => {
    const set = new Set(docs.map((d) => d.category));
    return Array.from(set).sort();
  }, [docs]);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return docs.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSearch =
        !query ||
        [doc.title, doc.filename, doc.category, doc.summary].some((v) =>
          String(v ?? '').toLowerCase().includes(query)
        );
      return matchesCategory && matchesSearch;
    });
  }, [docs, selectedCategory, searchQuery]);

  async function handleRefresh() {
    setRefreshing(true);
    clearAllAuthErrors();
    try {
      await refreshPublicDocs();
    } catch (error) {
      if (!consumeUnauthorized(error)) {
        // silently surface via SWR
      }
    } finally {
      setRefreshing(false);
    }
  }

  const isLoading = gateLoading || docsQuery.isLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {t('docs.title')}
          </h1>
          <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('docs.description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary">{t('common.operator')}</Badge>
          <span className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {session?.email ?? t('common.loading')}
          </span>
        </div>
      </div>

      {/* Search + Refresh */}
      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex-1">
            <span className="sr-only">{t('common.search')}</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--kw-border)] bg-white px-4 py-3 text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text-muted)]">
              <Search className="h-4 w-4 flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('docs.searchPlaceholder')}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--kw-text-muted)] dark:placeholder:text-[var(--kw-dark-text-muted)]"
              />
            </div>
          </label>
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={handleRefresh}
            leftIcon={!refreshing ? <RefreshCw className="h-4 w-4" /> : undefined}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </Card>

      {/* Category Filters */}
      {categories.length > 0 && (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              value="all"
              active={selectedCategory === 'all'}
              onSelect={setSelectedCategory}
              label={t('common.all')}
            />
            {categories.map((category) => (
              <FilterButton
                key={category}
                value={category}
                active={selectedCategory === category}
                onSelect={setSelectedCategory}
                label={category}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Alerts */}
      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('docs.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('docs.sessionForbidden')} />
      ) : null}

      {gateError && !shouldShowSessionExpired && !shouldShowForbidden ? (
        <Card
          role="alert"
          aria-live="assertive"
          className="bg-[var(--kw-rose-surface)]/80 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{gateError}</span>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              onClick={handleRefresh}
              leftIcon={!refreshing ? <RefreshCw className="h-4 w-4" /> : undefined}
            >
              {t('common.retry')}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {t('docs.loading')}
        </Card>
      ) : docs.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} message={t('docs.empty')} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} message={t('docs.noResults')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDocs.map((doc) => (
            <DocCard
              key={`${doc.category}/${doc.filename}`}
              doc={doc}
              onClick={() => setSelectedDoc({ category: doc.category, filename: doc.filename })}
            />
          ))}
        </div>
      )}

      {/* Doc Detail Modal */}
      <Modal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={docDetailQuery.data?.title ?? docDetailQuery.data?.filename ?? t('docs.detailTitle')}
        size="lg"
      >
        {docDetailQuery.isLoading ? (
          <div className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <span className="animate-spin">🌸</span>
            {t('docs.loadingContent')}
          </div>
        ) : docDetailQuery.error instanceof Error ? (
          <Card
            role="alert"
            className="bg-[var(--kw-rose-surface)]/80 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]"
          >
            {docDetailQuery.error.message}
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{docDetailQuery.data?.category}</Badge>
              <Badge variant="secondary">{docDetailQuery.data?.filename}</Badge>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--kw-border)] bg-white/80 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80">
              <pre className="whitespace-pre-wrap break-words text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {docDetailQuery.data?.content ?? t('docs.noContent')}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
});

function DocCard({ doc, onClick }: { doc: { category: string; filename: string; title?: string; summary?: string }; onClick: () => void }) {
  const { t: _t } = useI18n();
  return (
    <Card
      variant="feature"
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {doc.title ?? doc.filename}
          </p>
          <p className="mt-1 text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {doc.category}
          </p>
          {doc.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {doc.summary}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/60 flex flex-col items-center justify-center border border-dashed border-[var(--kw-border)] bg-white/70 p-8 text-center dark:border-[var(--kw-dark-border)]">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
        {icon}
      </div>
      <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">{message}</p>
    </Card>
  );
}

export default function DocsPage() {
  return (
    <Layout>
      <DocsContent />
    </Layout>
  );
}
