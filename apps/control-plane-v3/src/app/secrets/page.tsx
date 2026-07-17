'use client';

import { useState } from 'react';
import { Edit3, Eye, Globe2, KeyRound, Plus, Search, Shield, Trash2, X } from 'lucide-react';
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

  function resetFilters() {
    setSearch('');
    setTypeFilter('all');
    setOffset(0);
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            VaultGate
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {t('secrets.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('secrets.description')}</p>
        </div>
        <Button leftIcon={<Plus />} onClick={() => setEditing('new')}>
          {t('secrets.newSecret')}
        </Button>
      </header>

      <section
        aria-label={t('secrets.filterLabel')}
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
      >
        <div className="relative">
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
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
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
          <SelectTrigger aria-label={t('secrets.filterType')}>
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
        <div className="flex min-h-11 items-center text-sm tabular-nums text-muted-foreground md:justify-end">
          {t('secrets.resultCount', { count: total })}
        </div>
      </section>

      {deleteError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 border-y border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span>{deleteError}</span>
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setDeleteError(null)}
          >
            {t('common.close')}
          </button>
        </div>
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
              <Button variant="outline" onClick={() => void refresh()}>
                {t('common.retry')}
              </Button>
            }
            className="border-y"
          />
        ) : secrets.length === 0 ? (
          <EmptyState
            title={t(filtered ? 'secrets.noResultsTitle' : 'secrets.emptyTitle')}
            description={t(filtered ? 'secrets.noResultsDesc' : 'secrets.emptyDesc')}
            icon={<KeyRound className="h-6 w-6" />}
            action={
              filtered ? (
                <Button variant="outline" onClick={resetFilters}>
                  {t('secrets.clearFilters')}
                </Button>
              ) : (
                <Button leftIcon={<Plus />} onClick={() => setEditing('new')}>
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
    <article className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate font-medium text-foreground">{secret.name}</h2>
          <Badge variant="secondary" className="font-normal">
            {t(`secrets.types.${secret.type}`)}
          </Badge>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {secret.url && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="max-w-[36ch] truncate">{secret.url}</span>
            </span>
          )}
          {secret.username && <span className="max-w-[28ch] truncate">{secret.username}</span>}
          {secret.description && <span className="line-clamp-1">{secret.description}</span>}
        </div>
        {secret.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {secret.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 sm:justify-end">
        <Button variant="ghost" size="sm" leftIcon={<Eye />} onClick={onReveal}>
          {t('secrets.reveal')}
        </Button>
        <Button variant="ghost" size="sm" leftIcon={<Edit3 />} onClick={onEdit}>
          {t('common.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Trash2 />}
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          {t('common.delete')}
        </Button>
      </div>
    </article>
  );
}

function SecretListSkeleton() {
  return (
    <div className="divide-y border-y" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-3 py-5 sm:px-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      ))}
    </div>
  );
}
