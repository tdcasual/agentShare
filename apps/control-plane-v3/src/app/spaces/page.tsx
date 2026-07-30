'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  createSpace,
  removeSpace,
  saveSpaceMemberships,
  updateSpace,
  useAllAgentTokens,
  useSpaceMemberships,
  useSpaces,
} from '@/domains/space';
import type { SpaceMembership } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type SpaceRole = SpaceMembership['role'];

export default function SpacesPage() {
  const { t } = useI18n();
  const { spaces, isLoading, error, refresh } = useSpaces();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedSpace = spaces.find((space) => space.id === selectedId) ?? null;
  const {
    members,
    isLoading: membersLoading,
    error: membersError,
  } = useSpaceMemberships(selectedId);
  const {
    tokens,
    total: tokenTotal,
    isLoading: tokensLoading,
    error: tokensError,
  } = useAllAgentTokens();
  const [draft, setDraft] = useState<SpaceMembership[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const draftByToken = useMemo(
    () => new Map(draft.map((membership) => [membership.token_id, membership])),
    [draft]
  );

  useEffect(() => {
    if (spaces.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !spaces.some((space) => space.id === selectedId)) {
      setSelectedId(spaces[0].id);
    }
  }, [selectedId, spaces]);

  useEffect(() => {
    if (!dirty) {
      setDraft(members);
    }
  }, [dirty, members]);

  function toggleToken(tokenId: string, checked: boolean) {
    setDirty(true);
    setActionError(null);
    setDraft((current) =>
      checked
        ? [...current, { token_id: tokenId, role: 'reader', status: 'active' }]
        : current.filter((membership) => membership.token_id !== tokenId)
    );
  }

  function setRole(tokenId: string, role: SpaceRole) {
    setDirty(true);
    setDraft((current) =>
      current.map((membership) =>
        membership.token_id === tokenId ? { ...membership, role } : membership
      )
    );
  }

  async function saveMembers() {
    if (!selectedId) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await saveSpaceMemberships(selectedId, draft);
      setDirty(false);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('spaces.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setActionError(null);
    try {
      const created = await createSpace({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setShowCreate(false);
      setSelectedId(created.id);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('spaces.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function toggleArchive() {
    if (!selectedSpace) {
      return;
    }
    setActionError(null);
    try {
      await updateSpace(selectedSpace.id, {
        status: selectedSpace.status === 'active' ? 'archived' : 'active',
      });
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('spaces.updateFailed'));
    }
  }

  async function deleteSelected() {
    if (!selectedSpace) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await removeSpace(selectedSpace.id);
      setConfirmDelete(false);
      setSelectedId(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('spaces.deleteFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold text-foreground">{t('spaces.title')}</h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('spaces.resultCount', { count: spaces.length })}
          </span>
        </div>
        <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
          {t('spaces.new')}
        </Button>
      </header>

      {error && <InlineAlert>{error.message}</InlineAlert>}
      {actionError && <InlineAlert>{actionError}</InlineAlert>}

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : spaces.length === 0 ? (
        <EmptyState
          title={t('spaces.empty')}
          icon={<Boxes className="h-6 w-6" />}
          action={
            <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
              {t('spaces.new')}
            </Button>
          }
          className="border-y"
        />
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label={t('spaces.listLabel')} className="min-w-0 border-y lg:border-r">
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                aria-current={space.id === selectedId ? 'page' : undefined}
                onClick={() => {
                  setSelectedId(space.id);
                  setDirty(false);
                  setActionError(null);
                }}
                className={`flex min-h-14 w-full items-center gap-3 border-b px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${space.id === selectedId ? 'bg-accent' : 'hover:bg-accent/50'}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{space.name}</span>
                  {space.description && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {space.description}
                    </span>
                  )}
                </span>
                <Badge variant={space.status === 'active' ? 'success' : 'secondary'}>
                  {t(`spaces.status.${space.status}`)}
                </Badge>
              </button>
            ))}
          </nav>

          {selectedSpace && (
            <section className="min-w-0" aria-labelledby="space-members-heading">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0">
                  <h2 id="space-members-heading" className="truncate text-lg font-semibold">
                    {selectedSpace.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('spaces.memberCount', { count: draft.length })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={selectedSpace.status === 'active' ? <Archive /> : <RotateCcw />}
                    onClick={() => void toggleArchive()}
                  >
                    {t(selectedSpace.status === 'active' ? 'spaces.archive' : 'spaces.reactivate')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    leftIcon={<Trash2 />}
                    onClick={() => setConfirmDelete(true)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>

              {membersError && <InlineAlert className="mt-4">{membersError.message}</InlineAlert>}
              {tokensError && <InlineAlert className="mt-4">{tokensError.message}</InlineAlert>}
              {tokenTotal > 200 && (
                <p role="status" className="mt-3 text-sm text-status-warning-subtle-foreground">
                  {t('spaces.tokenLimit', { count: tokenTotal })}
                </p>
              )}

              {membersLoading || tokensLoading ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : tokens.length === 0 ? (
                <EmptyState title={t('spaces.noTokens')} className="mt-4 border-y" />
              ) : (
                <div className="mt-4 divide-y border-y">
                  {tokens.map((token) => {
                    const membership = draftByToken.get(token.id);
                    return (
                      <div
                        key={token.id}
                        className="grid min-h-16 gap-3 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
                      >
                        <label className="flex min-w-0 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={Boolean(membership)}
                            onChange={(event) => toggleToken(token.id, event.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              <span>{token.agent_name}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{token.name}</span>
                              <Badge variant={token.status === 'active' ? 'success' : 'secondary'}>
                                {t(`agents.tokenStatus.${token.status}`)}
                              </Badge>
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {token.key_prefix}…
                            </span>
                          </span>
                        </label>
                        <Select
                          value={membership?.role ?? 'reader'}
                          disabled={!membership}
                          onValueChange={(role) => setRole(token.id, role as SpaceRole)}
                        >
                          <SelectTrigger aria-label={t('spaces.roleFor', { name: token.name })}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(['reader', 'contributor', 'maintainer'] as const).map((role) => (
                              <SelectItem key={role} value={role}>
                                {t(`spaces.roles.${role}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {dirty && (
                  <span role="status" className="text-sm text-status-warning-subtle-foreground">
                    {t('spaces.unsaved')}
                  </span>
                )}
                <Button
                  size="sm"
                  leftIcon={<Save />}
                  loading={saving}
                  disabled={!dirty || saving}
                  onClick={() => void saveMembers()}
                >
                  {t('spaces.saveMembers')}
                </Button>
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => !creating && setShowCreate(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('spaces.new')}</DialogTitle>
            <DialogDescription>{t('spaces.createDescription')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="space-y-2">
              <Label htmlFor="space-name">{t('spaces.name')}</Label>
              <Input
                id="space-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-description">{t('spaces.description')}</Label>
              <Input
                id="space-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={creating}
                onClick={() => setShowCreate(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={creating}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSelected()}
        title={t('spaces.deleteTitle')}
        message={t('spaces.deleteMessage', { name: selectedSpace?.name ?? '' })}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={saving}
      />
    </main>
  );
}
