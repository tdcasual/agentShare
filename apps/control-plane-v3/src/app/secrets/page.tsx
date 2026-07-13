'use client';

import { useState } from 'react';
import { useSecrets, createSecret, deleteSecret } from '@/domains/secret';
import { useTokens } from '@/domains/token';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Key, Globe, Shield, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

type SecretType =
  | 'password'
  | 'api_key'
  | 'basic_auth'
  | 'bearer_token'
  | 'api_key_header'
  | 'oauth_token'
  | 'certificate'
  | 'ssh_key'
  | 'database_url'
  | 'custom';

const SECRET_TYPES: SecretType[] = [
  'password',
  'api_key',
  'basic_auth',
  'bearer_token',
  'api_key_header',
  'oauth_token',
  'certificate',
  'ssh_key',
  'database_url',
  'custom',
];

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
  password: 'bg-status-brand-subtle text-status-brand-subtle-foreground',
  api_key: 'bg-status-info-subtle text-status-info-subtle-foreground',
  basic_auth: 'bg-status-success-subtle text-status-success-subtle-foreground',
  bearer_token: 'bg-status-warning-subtle text-status-warning-subtle-foreground',
  api_key_header: 'bg-status-info-subtle text-status-info-subtle-foreground',
  oauth_token: 'bg-status-success-subtle text-status-success-subtle-foreground',
  certificate: 'bg-status-brand-subtle text-status-brand-subtle-foreground',
  ssh_key: 'bg-status-brand-subtle text-status-brand-subtle-foreground',
  database_url: 'bg-status-info-subtle text-status-info-subtle-foreground',
  custom: 'bg-muted text-foreground',
};

const EMPTY_FORM = {
  name: '',
  type: 'password' as SecretType,
  value: '',
  url: '',
  username: '',
  description: '',
};

export default function SecretsPage() {
  const { t } = useI18n();
  const { secrets, isLoading, error, refresh } = useSecrets();
  const { tokens } = useTokens();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const openCreate = () => {
    setCreateError(null);
    setShowCreate((v) => !v);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.value) {
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await createSecret({
        type: form.type,
        name: form.name.trim(),
        value: form.value,
        url: form.url.trim() || undefined,
        username: form.username.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('secrets.createForm.saveFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }
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
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('secrets.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('secrets.description')}</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t('secrets.newSecret')}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t('secrets.createForm.title')}
          </h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="w-full space-y-2">
                <Label htmlFor="secret-type">{t('secrets.createForm.type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm((f) => ({ ...f, type: value as SecretType }))}
                >
                  <SelectTrigger id="secret-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECRET_TYPES.map((secretType) => (
                      <SelectItem key={secretType} value={secretType}>
                        {secretType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret-name">{t('secrets.createForm.name')}</Label>
                <Input
                  id="secret-name"
                  placeholder={t('secrets.createForm.namePlaceholder')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label htmlFor="secret-value">{t('secrets.createForm.value')}</Label>
              <Textarea
                id="secret-value"
                placeholder={t('secrets.createForm.valuePlaceholder')}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                required
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="secret-url">{t('secrets.createForm.url')}</Label>
                <Input
                  id="secret-url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret-username">{t('secrets.createForm.username')}</Label>
                <Input
                  id="secret-username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret-description">{t('secrets.createForm.description')}</Label>
              <Input
                id="secret-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
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
                  setForm(EMPTY_FORM);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button size="sm" type="submit" loading={isCreating}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-foreground">{secrets.length}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.totalSecrets')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-foreground">{tokens.length}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.activeTokens')}</div>
        </Card>
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {deleteError}
          <button type="button" onClick={() => setDeleteError(null)} className="ml-2 underline">
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Secrets List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t('secrets.loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {t('secrets.loadFailed')}: {error.message}
          </div>
        ) : secrets.length === 0 ? (
          <EmptyState
            title={t('secrets.emptyTitle')}
            description={t('secrets.emptyDesc')}
            icon={<Key className="h-6 w-6" />}
            action={
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                {t('secrets.newSecret')}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-foreground">{secret.name}</h3>
                    <Badge
                      variant="secondary"
                      className={cn('flex items-center gap-1', SECRET_TYPE_COLORS[secret.type])}
                    >
                      {SECRET_TYPE_ICONS[secret.type]}
                      <span className="text-xs">{secret.type}</span>
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                      <span>
                        {t('secrets.tags')} {secret.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setDeleteTarget({ id: secret.id, name: secret.name })}
                    className="text-destructive hover:text-destructive"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
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
