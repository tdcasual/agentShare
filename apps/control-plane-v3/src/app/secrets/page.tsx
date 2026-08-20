'use client';

import { useState } from 'react';
import { Edit3, Eye, KeyRound, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import { deleteSecret, useSecrets } from '@/domains/secret';
import type { Secret, SecretType } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { SecretEditorDialog } from '@/features/secrets/secret-editor-dialog';
import { SecretRevealDialog } from '@/features/secrets/secret-reveal-dialog';
import { SECRET_TYPES } from '@/features/secrets/secret-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 25;

export default function SecretsPage() {
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const deferredSearch = useDebouncedValue(search.trim());
  const [typeFilter, setTypeFilter] = useState<'all' | SecretType>('all');
  const { secrets, total, isLoading, error, refresh } = useSecrets({
    limit: PAGE_SIZE,
    offset,
    search: deferredSearch || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });
  const [editing, setEditing] = useState<Secret | 'new' | null>(null);
  const [revealing, setRevealing] = useState<Secret | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = Boolean(deferredSearch || typeFilter !== 'all');

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSecret(deleteTarget.id);
      setDeleteTarget(null);
      if (secrets.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE));
      }
      await refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : t('secrets.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t('secrets.title')}
          </h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('secrets.resultCount', { count: total })}
          </span>
        </div>
        <Button size="sm" leftIcon={<Plus />} onClick={() => setEditing('new')}>
          {t('secrets.newSecret')}
        </Button>
      </header>

      <section aria-label={t('secrets.filterLabel')} className="flex gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            maxLength={255}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
            className="pl-10 pr-10"
            placeholder={t('secrets.searchPlaceholder')}
            aria-label={t('secrets.searchPlaceholder')}
          />
          {search && (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                setSearch('');
                setOffset(0);
              }}
              aria-label={t('secrets.clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value as 'all' | SecretType);
            setOffset(0);
          }}
        >
          <SelectTrigger aria-label={t('secrets.filterType')} className="w-40 shrink-0 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('secrets.allTypes')}</SelectItem>
            {SECRET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`secrets.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {deleteError && (
        <InlineAlert>
          <div className="flex items-start justify-between gap-4">
            <span>{deleteError}</span>
            <button
              type="button"
              className="rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setDeleteError(null)}
            >
              {t('common.close')}
            </button>
          </div>
        </InlineAlert>
      )}

      <section aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <SecretListSkeleton />
        ) : error ? (
          <EmptyState
            title={t('secrets.loadFailed')}
            description={error.message}
            icon={<Shield className="h-6 w-6" />}
            action={
              <Button variant="outline" size="sm" onClick={() => void refresh()}>
                {t('common.retry')}
              </Button>
            }
            className="border-y"
          />
        ) : secrets.length === 0 ? (
          <EmptyState
            title={t(filtered ? 'secrets.noResultsTitle' : 'secrets.emptyTitle')}
            icon={<KeyRound className="h-6 w-6" />}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setOffset(0);
                  }}
                >
                  {t('secrets.clearFilters')}
                </Button>
              ) : (
                <Button size="sm" leftIcon={<Plus />} onClick={() => setEditing('new')}>
                  {t('secrets.newSecret')}
                </Button>
              )
            }
            className="border-y"
          />
        ) : (
          <div className="divide-y border-y">
            {secrets.map((secret) => (
              <SecretRow
                key={secret.id}
                secret={secret}
                onEdit={() => setEditing(secret)}
                onReveal={() => setRevealing(secret)}
                onDelete={() => setDeleteTarget(secret)}
              />
            ))}
          </div>
        )}
      </section>

      <PaginationControls
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onOffsetChange={setOffset}
      />

      <SecretEditorDialog
        open={editing !== null}
        secret={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={async () => {
          setOffset(0);
          await refresh();
        }}
      />
      <SecretRevealDialog
        secret={revealing}
        open={revealing !== null}
        onOpenChange={(open) => !open && setRevealing(null)}
      />
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('secrets.deleteTitle')}
        message={deleteTarget ? t('secrets.deleteConfirm', { name: deleteTarget.name }) : ''}
        confirmText={t('secrets.deleteAction')}
        variant="danger"
        isLoading={isDeleting}
      />
    </main>
  );
}

function SecretRow({
  secret,
  onEdit,
  onReveal,
  onDelete,
}: {
  secret: Secret;
  onEdit: () => void;
  onReveal: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <article className="group flex min-w-0 items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/40 sm:px-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="min-w-0 truncate text-sm font-medium text-foreground">{secret.name}</h2>
          <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
            {t(`secrets.types.${secret.type}`)}
          </Badge>
          {secret.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-muted px-1.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        {(secret.url || secret.documentation_url || secret.username || secret.description) && (
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {secret.url && <span className="max-w-[32ch] truncate">{secret.url}</span>}
            {secret.documentation_url && (
              <a
                href={secret.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[32ch] truncate underline underline-offset-2"
              >
                {t('secrets.documentationLink')}
              </a>
            )}
            {secret.username && <span className="max-w-[24ch] truncate">{secret.username}</span>}
            {secret.description && (
              <span className="min-w-0 flex-1 truncate">{secret.description}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-11 px-0"
          onClick={onReveal}
          aria-label={t('secrets.reveal')}
          title={t('secrets.reveal')}
        >
          <Eye />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 px-0"
          onClick={onEdit}
          aria-label={t('common.edit')}
          title={t('common.edit')}
        >
          <Edit3 />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 px-0 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={t('common.delete')}
          title={t('common.delete')}
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}

function SecretListSkeleton() {
  return (
    <div className="divide-y border-y" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="space-y-2 px-3 py-3">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}
