'use client';

import { useState } from 'react';
import { useTokens, createToken, revokeToken } from '@/domains/token';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Key, Copy, Check, Trash2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

const EXPIRATION_OPTIONS = ['never', '7', '30', '90'] as const;
type ExpirationOption = (typeof EXPIRATION_OPTIONS)[number];

export default function TokensPage() {
  const { t } = useI18n();
  const { tokens, isLoading, error, refresh } = useTokens();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('30');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<Awaited<ReturnType<typeof createToken>> | null>(
    null
  );
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCopy = async (keyPrefix: string, id: string) => {
    await navigator.clipboard.writeText(keyPrefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyToken = async () => {
    if (!createdToken) {
      return;
    }
    await navigator.clipboard.writeText(createdToken.token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const expires_at =
        expiration === 'never'
          ? null
          : new Date(Date.now() + Number(expiration) * 86_400_000).toISOString();
      const response = await createToken({ name: name.trim(), expires_at });
      setCreatedToken(response);
      setName('');
      setExpiration('30');
      setShowCreate(false);
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('tokens.createForm.saveFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) {
      return;
    }
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await revokeToken(revokeTarget.id);
      setRevokeTarget(null);
      refresh();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : t('tokens.revokeFailed'));
    } finally {
      setIsRevoking(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return t('tokens.never');
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) {
      return false;
    }
    return new Date(expiresAt) < new Date();
  };

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('tokens.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('tokens.description')}</p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setCreateError(null);
            setShowCreate((v) => !v);
          }}
        >
          {t('tokens.newToken')}
        </Button>
      </div>

      {/* Created Token (shown once) */}
      {createdToken && (
        <Card className="border border-status-warning/20 bg-status-warning-subtle p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-status-warning/10">
              <Key className="h-4 w-4 text-status-warning" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-status-warning-subtle-foreground">
                {t('tokens.created.title')}
              </p>
              <p className="mt-1 text-status-warning-subtle-foreground/80">
                {t('tokens.created.warning')}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block flex-1 break-all rounded-lg bg-card px-3 py-2 font-mono text-xs text-foreground">
                  {createdToken.token}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />
                  }
                  onClick={handleCopyToken}
                >
                  {tokenCopied ? t('tokens.copied') : t('tokens.created.copyToken')}
                </Button>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setCreatedToken(null)}>
                  {t('tokens.created.done')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border border-status-info/20 bg-status-info-subtle p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-status-info/10">
            <Key className="h-4 w-4 text-status-info" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-status-info-subtle-foreground">{t('tokens.about')}</p>
            <p className="mt-1 text-status-info-subtle-foreground/80">{t('tokens.aboutDesc')}</p>
          </div>
        </div>
      </Card>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('tokens.createForm.title')}
          </h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">{t('tokens.createForm.name')}</Label>
              <Input
                id="token-name"
                placeholder={t('tokens.createForm.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor="token-expiration">{t('tokens.createForm.expiration')}</Label>
              <Select
                value={expiration}
                onValueChange={(value) => setExpiration(value as ExpirationOption)}
              >
                <SelectTrigger id="token-expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt === 'never'
                        ? t('tokens.createForm.never')
                        : t('tokens.createForm.days', { count: opt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                  setName('');
                  setExpiration('30');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button size="sm" type="submit" loading={isCreating}>
                {t('common.create')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Revoke Error */}
      {revokeError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {revokeError}
          <button type="button" onClick={() => setRevokeError(null)} className="ml-2 underline">
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Tokens List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('tokens.loading')}</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {t('tokens.loadFailed')}: {error.message}
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Key className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">{t('tokens.emptyTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{t('tokens.emptyDesc')}</p>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setCreateError(null);
                setShowCreate(true);
              }}
            >
              {t('tokens.newToken')}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tokens.map((token) => {
              const expired = isExpired(token.expires_at);
              return (
                <div
                  key={token.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-foreground">{token.name}</h3>
                      <Badge
                        variant="secondary"
                        className={
                          token.status === 'active' && !expired
                            ? 'bg-status-success-subtle text-status-success-subtle-foreground hover:bg-status-success-subtle'
                            : 'bg-status-warning-subtle text-status-warning-subtle-foreground hover:bg-status-warning-subtle'
                        }
                      >
                        {expired ? t('tokens.expired') : token.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{token.key_prefix}***</span>
                      <span>{formatDate(token.created_at)}</span>
                      {token.expires_at && (
                        <span>
                          {t('tokens.expires')}: {formatDate(token.expires_at)}
                        </span>
                      )}
                      {token.last_used_at && (
                        <span>
                          {t('tokens.lastUsed')}: {formatDate(token.last_used_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={
                        copiedId === token.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )
                      }
                      onClick={() => handleCopy(token.key_prefix, token.id)}
                    >
                      {copiedId === token.id ? t('tokens.copied') : t('tokens.copy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setRevokeTarget({ id: token.id, name: token.name })}
                      disabled={token.status !== 'active'}
                      className="text-destructive hover:text-destructive"
                    >
                      {t('tokens.revoke')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* API Usage Guide */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-foreground">{t('tokens.apiUsage')}</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot; http://localhost:8000/api/vault
          </p>
        </div>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title={t('tokens.revoke')}
        message={revokeTarget ? t('tokens.revokeConfirm', { name: revokeTarget.name }) : ''}
        confirmText={t('tokens.revoke')}
        variant="danger"
        isLoading={isRevoking}
      />
    </main>
  );
}
