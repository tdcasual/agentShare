'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createSecret, updateSecret } from '@/domains/secret';
import type { Secret, SecretType } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { parseTags, SECRET_TYPES } from './secret-types';

type SecretForm = {
  name: string;
  type: SecretType;
  value: string;
  url: string;
  documentationUrl: string;
  username: string;
  description: string;
  tags: string;
};

const EMPTY_FORM: SecretForm = {
  name: '',
  type: 'password',
  value: '',
  url: '',
  documentationUrl: '',
  username: '',
  description: '',
  tags: '',
};

function formFromSecret(secret?: Secret): SecretForm {
  if (!secret) {
    return EMPTY_FORM;
  }
  return {
    name: secret.name,
    type: secret.type,
    value: '',
    url: secret.url ?? '',
    documentationUrl: secret.documentation_url ?? '',
    username: secret.username ?? '',
    description: secret.description ?? '',
    tags: secret.tags.join(', '),
  };
}

export function SecretEditorDialog({
  open,
  secret,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  secret?: Secret;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<unknown>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<SecretForm>(() => formFromSecret(secret));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(formFromSecret(secret));
      setError(null);
    }
  }, [open, secret]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const common = {
        name: form.name.trim(),
        type: form.type,
        tags: parseTags(form.tags),
      };
      if (secret) {
        await updateSecret(secret.id, {
          ...common,
          url: form.url.trim() || null,
          documentation_url: form.documentationUrl.trim() || null,
          username: form.username.trim() || null,
          description: form.description.trim() || null,
          ...(form.value ? { value: form.value } : {}),
        });
      } else {
        await createSecret({
          ...common,
          value: form.value,
          url: form.url.trim() || undefined,
          documentation_url: form.documentationUrl.trim() || undefined,
          username: form.username.trim() || undefined,
          description: form.description.trim() || undefined,
        });
      }
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('secrets.createForm.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[min(90dvh,760px)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(secret ? 'secrets.createForm.editTitle' : 'secrets.createForm.title')}
          </DialogTitle>
          <DialogDescription>{t('secrets.createForm.descriptionText')}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="secret-name">{t('secrets.createForm.name')}</Label>
              <Input
                id="secret-name"
                value={form.name}
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t('secrets.createForm.namePlaceholder')}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret-type">{t('secrets.createForm.type')}</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, type: value as SecretType }))
                }
              >
                <SelectTrigger id="secret-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECRET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`secrets.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-documentation-url">
              {t('secrets.createForm.documentationUrl')}
            </Label>
            <Input
              id="secret-documentation-url"
              type="url"
              value={form.documentationUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, documentationUrl: event.target.value }))
              }
              placeholder="https://docs.example.com/"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-value">{t('secrets.createForm.value')}</Label>
            <Textarea
              id="secret-value"
              value={form.value}
              onChange={(event) =>
                setForm((current) => ({ ...current, value: event.target.value }))
              }
              placeholder={
                secret
                  ? t('secrets.createForm.valueEditPlaceholder')
                  : t('secrets.createForm.valuePlaceholder')
              }
              required={!secret}
              rows={4}
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="secret-url">{t('secrets.createForm.url')}</Label>
              <Input
                id="secret-url"
                type="url"
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret-username">{t('secrets.createForm.username')}</Label>
              <Input
                id="secret-username"
                value={form.username}
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-tags">{t('secrets.createForm.tags')}</Label>
            <Input
              id="secret-tags"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder={t('secrets.createForm.tagsPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-description">{t('secrets.createForm.description')}</Label>
            <Textarea
              id="secret-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
            />
          </div>

          {error && <InlineAlert>{error}</InlineAlert>}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t(secret ? 'secrets.saveChanges' : 'secrets.createSecret')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
