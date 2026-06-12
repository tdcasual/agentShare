'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTokens, revokeToken } from '@/domains/token';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Badge } from '@/shared/ui-primitives/badge';
import { ConfirmModal } from '@/shared/ui-primitives/modal';
import {
  Plus,
  Key,
  Copy,
  Check,
  Settings,
  Trash2,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export default function TokensPage() {
  const { t } = useI18n();
  const { tokens, isLoading, error, refresh } = useTokens();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleCopy = async (keyPrefix: string, id: string) => {
    await navigator.clipboard.writeText(keyPrefix);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
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
    if (!dateStr) return t('tokens.never');
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
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
        <Link href="/tokens/new">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {t('tokens.newToken')}
          </Button>
        </Link>
      </div>

      {/* Info Card */}
      <Card className="border border-[var(--kw-blue-surface)] bg-[var(--kw-blue-surface)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kw-blue-surface)]">
            <Key className="h-4 w-4 text-[var(--kw-blue-text)]" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-[var(--kw-blue-text)]">
              {t('tokens.about')}
            </p>
            <p className="mt-1 text-[var(--kw-blue-text)]">
              {t('tokens.aboutDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Revoke Error */}
      {revokeError && (
        <div className="rounded-lg border border-[var(--kw-red-surface)] bg-[var(--kw-red-surface)] p-3 text-sm text-[var(--kw-red-text)]">
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
          <div className="p-8 text-center text-sm text-[var(--kw-red-text)]">
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
            <Link href="/tokens/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                {t('tokens.newToken')}
              </Button>
            </Link>
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
                    <Link href={`/tokens/${token.id}`}>
                      <Button variant="ghost" size="sm" leftIcon={<Settings className="h-4 w-4" />}>
                        {t('tokens.scopes')}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setRevokeTarget({ id: token.id, name: token.name })}
                      disabled={token.status !== 'active'}
                      className="text-[var(--kw-red-text)] hover:text-[var(--kw-red-text)]"
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
