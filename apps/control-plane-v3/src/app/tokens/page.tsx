'use client';

import { useState } from 'react';
import { useTokens, createToken, revokeToken } from '@/domains/token';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { Badge } from '@/shared/ui-primitives/badge';
import { ConfirmModal } from '@/shared/ui-primitives/modal';
import {
  Plus,
  Key,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
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
  const [createdToken, setCreatedToken] = useState<Awaited<ReturnType<typeof createToken>> | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCopy = async (keyPrefix: string, id: string) => {
    await navigator.clipboard.writeText(keyPrefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyToken = async () => {
    if (!createdToken) {return;}
    await navigator.clipboard.writeText(createdToken.token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {return;}
    setIsCreating(true);
    setCreateError(null);
    try {
      const expires_at =
        expiration === 'never' ? null : new Date(Date.now() + Number(expiration) * 86_400_000).toISOString();
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
    if (!revokeTarget) {return;}
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
    if (!dateStr) {return t('tokens.never');}
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) {return false;}
    return new Date(expiresAt) < new Date();
  };

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kw-text)] sm:text-3xl">
            {t('tokens.title')}
          </h1>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {t('tokens.description')}
          </p>
        </div>
        <Button
          variant="primary"
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
        <Card className="border border-[var(--kw-amber-surface)] bg-[var(--kw-amber-surface)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kw-amber-surface)]">
              <Key className="h-4 w-4 text-[var(--kw-amber-text)]" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-[var(--kw-amber-text)]">{t('tokens.created.title')}</p>
              <p className="mt-1 text-[var(--kw-amber-text)]">{t('tokens.created.warning')}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block flex-1 break-all rounded-lg bg-[var(--kw-surface)] px-3 py-2 font-mono text-xs text-[var(--kw-text)]">
                  {createdToken.token}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
      <Card className="border border-[var(--kw-sky-surface)] bg-[var(--kw-sky-surface)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kw-sky-surface)]">
            <Key className="h-4 w-4 text-[var(--kw-sky-text)]" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-[var(--kw-sky-text)]">
              {t('tokens.about')}
            </p>
            <p className="mt-1 text-[var(--kw-sky-text)]">
              {t('tokens.aboutDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--kw-text)]">
            {t('tokens.createForm.title')}
          </h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Input
              label={t('tokens.createForm.name')}
              placeholder={t('tokens.createForm.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="w-full">
              <label
                htmlFor="token-expiration"
                className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]"
              >
                {t('tokens.createForm.expiration')}
              </label>
              <select
                id="token-expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as ExpirationOption)}
                className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-[var(--kw-surface)] px-4 py-3 text-base outline-none transition-colors focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:bg-[var(--kw-dark-surface)]"
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'never' ? t('tokens.createForm.never') : t('tokens.createForm.days', { count: opt })}
                  </option>
                ))}
              </select>
            </div>
            {createError && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] p-3 text-sm text-[var(--kw-rose-text)]"
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
              <Button variant="primary" size="sm" type="submit" loading={isCreating}>
                {t('common.create')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Revoke Error */}
      {revokeError && (
        <div className="rounded-lg border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] p-3 text-sm text-[var(--kw-rose-text)]">
          {revokeError}
          <button
            type="button"
            onClick={() => setRevokeError(null)}
            className="ml-2 underline"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Tokens List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--kw-text-muted)]">
            {t('tokens.loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-[var(--kw-rose-text)]">
            {t('tokens.loadFailed')}: {error.message}
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-surface-alt)]">
              <Key className="h-6 w-6 text-[var(--kw-text-muted)]" />
            </div>
            <h3 className="mb-2 font-semibold text-[var(--kw-text)]">{t('tokens.emptyTitle')}</h3>
            <p className="mb-4 text-sm text-[var(--kw-text-muted)]">
              {t('tokens.emptyDesc')}
            </p>
            <Button
              variant="primary"
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
          <div className="divide-y divide-[var(--kw-border)]">
            {tokens.map((token) => {
              const expired = isExpired(token.expires_at);
              return (
                <div
                  key={token.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-[var(--kw-text)]">
                        {token.name}
                      </h3>
                      <Badge
                        variant={token.status === 'active' && !expired ? 'success' : 'warning'}
                      >
                        {expired ? t('tokens.expired') : token.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--kw-text-muted)]">
                      <span className="font-mono">{token.key_prefix}***</span>
                      <span>{formatDate(token.created_at)}</span>
                      {token.expires_at && (
                        <span>{t('tokens.expires')}: {formatDate(token.expires_at)}</span>
                      )}
                      {token.last_used_at && (
                        <span>{t('tokens.lastUsed')}: {formatDate(token.last_used_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={copiedId === token.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                      className="text-[var(--kw-rose-text)] hover:text-[var(--kw-rose-text)]"
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
        <h3 className="mb-3 font-semibold text-[var(--kw-text)]">{t('tokens.apiUsage')}</h3>
        <div className="space-y-2 text-sm text-[var(--kw-text-muted)]">
          <p>curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot; http://localhost:8000/api/vault</p>
        </div>
      </Card>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
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
