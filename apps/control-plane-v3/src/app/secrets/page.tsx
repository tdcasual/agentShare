'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSecrets, deleteSecret } from '@/domains/secret';
import { useTokens } from '@/domains/token';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Badge } from '@/shared/ui-primitives/badge';
import { ConfirmModal } from '@/shared/ui-primitives/modal';
import {
  Plus,
  Key,
  Globe,
  Shield,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

type SecretType = 'password' | 'api_key' | 'basic_auth' | 'bearer_token' | 'api_key_header' | 'oauth_token' | 'certificate' | 'ssh_key' | 'database_url' | 'custom';

const SECRET_TYPE_ICONS: Record<SecretType, React.ReactNode> = {
  password: <Key className="h-4 w-4" />,
  api_key: <Key className="h-4 w-4" />,
  basic_auth: <Shield className="h-4 w-4" />,
  bearer_token: <Shield className="h-4 w-4" />,
  api_key_header: <Key className="h-4 w-4" />,
  oauth_token: <Shield className="h-4 w-4" />,
  certificate: <Shield className="h-4 w-4" />,
  ssh_key: <Key className="h-4 w-4" />,
  database_url: <Globe className="h-4 w-4" />,
  custom: <Key className="h-4 w-4" />,
};

const SECRET_TYPE_COLORS: Record<SecretType, string> = {
  password: 'bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)]',
  api_key: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)]',
  basic_auth: 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]',
  bearer_token: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)]',
  api_key_header: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)]',
  oauth_token: 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]',
  certificate: 'bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)]',
  ssh_key: 'bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)]',
  database_url: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)]',
  custom: 'bg-[var(--kw-surface)] text-[var(--kw-text)]',
};

export default function SecretsPage() {
  const { t } = useI18n();
  const { secrets, isLoading, error, refresh } = useSecrets();
  const { tokens } = useTokens();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSecret(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('secrets.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kw-text)] sm:text-3xl">
            {t('secrets.title')}
          </h1>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {t('secrets.description')}
          </p>
        </div>
        <Link href="/secrets/new">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {t('secrets.newSecret')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--kw-text)]">{secrets.length}</div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('dashboard.totalSecrets')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--kw-text)]">{tokens.length}</div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('dashboard.activeTokens')}</div>
        </Card>
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="rounded-lg border border-[var(--kw-red-surface)] bg-[var(--kw-red-surface)] p-3 text-sm text-[var(--kw-red-text)]">
          {deleteError}
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="ml-2 underline"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Secrets List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--kw-text-muted)]">
            {t('secrets.loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-[var(--kw-red-text)]">
            {t('secrets.loadFailed')}: {error.message}
          </div>
        ) : secrets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-surface-alt)]">
              <Key className="h-6 w-6 text-[var(--kw-text-muted)]" />
            </div>
            <h3 className="mb-2 font-semibold text-[var(--kw-text)]">{t('secrets.emptyTitle')}</h3>
            <p className="mb-4 text-sm text-[var(--kw-text-muted)]">
              {t('secrets.emptyDesc')}
            </p>
            <Link href="/secrets/new">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                {t('secrets.newSecret')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--kw-border)]">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-[var(--kw-text)]">
                      {secret.name}
                    </h3>
                    <Badge
                      variant="info"
                      className={cn('flex items-center gap-1', SECRET_TYPE_COLORS[secret.type])}
                    >
                      {SECRET_TYPE_ICONS[secret.type]}
                      <span className="text-xs">{secret.type}</span>
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--kw-text-muted)]">
                    {secret.url && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {secret.url}
                      </span>
                    )}
                    {secret.username && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {secret.username}
                      </span>
                    )}
                    {secret.tags.length > 0 && (
                      <span className="text-[var(--kw-text-muted)]">
                        {t('secrets.tags')} {secret.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <Link href={`/secrets/${secret.id}`}>
                    <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                      {t('secrets.view')}
                    </Button>
                  </Link>
                  <Link href={`/secrets/${secret.id}/edit`}>
                    <Button variant="ghost" size="sm" leftIcon={<Edit className="h-4 w-4" />}>
                      {t('secrets.edit')}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setDeleteTarget({ id: secret.id, name: secret.name })}
                    className="text-[var(--kw-red-text)] hover:text-[var(--kw-red-text)]"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete')}
        message={deleteTarget ? t('secrets.deleteConfirm', { name: deleteTarget.name }) : ''}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={isDeleting}
      />
    </main>
  );
}
