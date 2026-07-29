'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Check, Clipboard, KeyRound, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createManagementToken,
  listManagementTokens,
  revokeManagementToken,
  rotateManagementToken,
  type IssuedManagementToken,
  type ManagementToken,
} from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { SettingsNavigation } from '@/components/settings-navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
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
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 25;

export default function ManagementTokensPage() {
  const { t, locale } = useI18n();
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/management-tokens?limit=${PAGE_SIZE}&offset=${offset}`,
    () => listManagementTokens({ limit: PAGE_SIZE, offset })
  );
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ttl, setTtl] = useState('2592000');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedManagementToken | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    token: ManagementToken;
    action: 'revoke' | 'rotate';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const issuedBannerRef = useRef<HTMLDivElement>(null);

  // 一次性明文横幅出现在列表上方后，滚动到可见位置（role="status" 负责读屏播报）
  useEffect(() => {
    if (issued) {
      issuedBannerRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [issued]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await createManagementToken({
        name: name.trim(),
        description: description.trim() || undefined,
        ttl_seconds: ttl === 'none' ? undefined : Number(ttl),
      });
      setIssued(created);
      setCopied(false);
      setName('');
      setDescription('');
      setShowCreate(false);
      setOffset(0);
      await mutate();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : t('managementTokens.createFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmAction() {
    if (!confirmTarget) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmTarget.action === 'revoke') {
        await revokeManagementToken(confirmTarget.token.id);
        // 撤销的是末页最后一条时回退一页，避免越界空态
        if ((data?.items.length ?? 0) === 1 && offset > 0) {
          setOffset((current) => Math.max(0, current - PAGE_SIZE));
        }
      } else {
        setIssued(await rotateManagementToken(confirmTarget.token.id));
        setCopied(false);
      }
      setConfirmTarget(null);
      await mutate();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : t('managementTokens.actionFailed'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <SettingsNavigation />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t('managementTokens.title')}
          </h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('managementTokens.count', { count: data?.total ?? 0 })}
          </span>
        </div>
        <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
          {t('managementTokens.new')}
        </Button>
      </header>

      {issued && (
        <div ref={issuedBannerRef} role="status">
          <Callout variant="warning" icon={<KeyRound className="h-5 w-5" />}>
            <div className="space-y-3">
              <p className="font-semibold">{t('managementTokens.issuedTitle')}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-sm">
                  {issued.token}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={copied ? <Check /> : <Clipboard />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(issued.token);
                      setCopied(true);
                      toast.success(t('common.copySuccess'));
                    } catch {
                      setActionError(t('managementTokens.copyFailed'));
                    }
                  }}
                >
                  {t(copied ? 'common.copied' : 'common.copy')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIssued(null);
                    setCopied(false);
                  }}
                >
                  {t('common.done')}
                </Button>
              </div>
            </div>
          </Callout>
        </div>
      )}

      {actionError && <InlineAlert>{actionError}</InlineAlert>}

      <section aria-live="polite">
        {isLoading ? (
          <div className="space-y-3 border-y py-3" aria-label={t('common.loading')}>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <InlineAlert>{error.message}</InlineAlert>
        ) : !data?.items.length ? (
          <EmptyState
            title={t('managementTokens.emptyTitle')}
            icon={<KeyRound className="h-6 w-6" />}
            action={
              <Button size="sm" leftIcon={<Plus />} onClick={() => setShowCreate(true)}>
                {t('managementTokens.new')}
              </Button>
            }
            className="border-y"
          />
        ) : (
          <div className="divide-y border-y">
            {data.items.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                locale={locale}
                onRevoke={() => setConfirmTarget({ token, action: 'revoke' })}
                onRotate={() => setConfirmTarget({ token, action: 'rotate' })}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <PaginationControls
        offset={offset}
        limit={PAGE_SIZE}
        total={data?.total ?? 0}
        onOffsetChange={setOffset}
      />

      <Dialog open={showCreate} onOpenChange={(open) => !saving && setShowCreate(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('managementTokens.createTitle')}</DialogTitle>
            <DialogDescription>{t('managementTokens.createDescription')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="management-token-name">{t('managementTokens.name')}</Label>
              <Input
                id="management-token-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management-token-description">
                {t('managementTokens.tokenDescription')}
              </Label>
              <Input
                id="management-token-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management-token-ttl">{t('managementTokens.ttl')}</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger id="management-token-ttl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('managementTokens.ttlNone')}</SelectItem>
                  <SelectItem value="86400">{t('managementTokens.ttlDay')}</SelectItem>
                  <SelectItem value="604800">{t('managementTokens.ttlWeek')}</SelectItem>
                  <SelectItem value="2592000">{t('managementTokens.ttlMonth')}</SelectItem>
                  <SelectItem value="31536000">{t('managementTokens.ttlYear')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <InlineAlert>{formError}</InlineAlert>}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {t('managementTokens.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => void confirmAction()}
        isLoading={actionLoading}
        variant={confirmTarget?.action === 'revoke' ? 'danger' : 'primary'}
        title={
          confirmTarget?.action === 'revoke'
            ? t('managementTokens.revokeTitle')
            : t('managementTokens.rotateTitle')
        }
        message={
          confirmTarget
            ? t(
                confirmTarget.action === 'revoke'
                  ? 'managementTokens.revokeMessage'
                  : 'managementTokens.rotateMessage',
                { name: confirmTarget.token.name }
              )
            : undefined
        }
        confirmText={
          confirmTarget?.action === 'revoke'
            ? t('managementTokens.revoke')
            : t('managementTokens.rotate')
        }
      />
    </main>
  );
}

function TokenRow({
  token,
  locale,
  onRevoke,
  onRotate,
  t,
}: {
  token: ManagementToken;
  locale: string;
  onRevoke: () => void;
  onRotate: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const revoked = Boolean(token.revoked_at);
  const expired = Boolean(token.expires_at && new Date(token.expires_at).getTime() <= Date.now());
  const statusKey = revoked
    ? 'managementTokens.revoked'
    : expired
      ? 'managementTokens.expired'
      : 'managementTokens.active';
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  return (
    <div className="flex min-w-0 items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/40 sm:px-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <h2 className="truncate text-sm font-medium">{token.name}</h2>
          <Badge variant={revoked || expired ? 'danger' : 'success'}>{t(statusKey)}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{token.key_prefix}…</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {token.description && <span>{token.description} · </span>}
          {t('managementTokens.expiresAt', {
            date: token.expires_at
              ? date.format(new Date(token.expires_at))
              : t('managementTokens.never'),
          })}
          {' · '}
          {t('managementTokens.lastUsedAt', {
            date: token.last_used_at
              ? date.format(new Date(token.last_used_at))
              : t('managementTokens.never'),
          })}
          {token.revoked_at &&
            ` · ${t('managementTokens.revokedAt', { date: date.format(new Date(token.revoked_at)) })}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRotate}
          disabled={revoked}
          leftIcon={<RotateCcw />}
        >
          {t('managementTokens.rotate')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRevoke}
          disabled={revoked || expired}
          leftIcon={revoked ? <Check /> : <Trash2 />}
          className={revoked ? '' : 'text-destructive hover:text-destructive'}
        >
          {t(revoked ? 'managementTokens.revoked' : 'managementTokens.revoke')}
        </Button>
      </div>
    </div>
  );
}
