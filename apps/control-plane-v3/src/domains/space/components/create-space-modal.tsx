/**
 * Create Space Modal - 创建空间模态框
 */

'use client';

import { useId, useState } from 'react';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';
import { Globe, X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface CreateSpaceModalProps {
  onClose: () => void;
  onCreate: (input: { name: string; summary: string }) => Promise<void>;
  isCreating: boolean;
}

export function CreateSpaceModal({ onClose, onCreate, isCreating }: CreateSpaceModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const idPrefix = useId();
  const nameId = `${idPrefix}-name`;
  const summaryId = `${idPrefix}-summary`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({ name, summary });
  };

  return (
    <Modal isOpen onClose={onClose} size="md" showCloseButton={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-purple-text)] text-white">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--kw-text)]">
              {t('spaces.createModal.title')}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
            aria-label={t('common.closeModal')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor={nameId}
              className="mb-1 block text-sm font-medium text-[var(--kw-text)]"
            >
              {t('spaces.createModal.nameLabel')} <span className="text-[var(--kw-error)]">*</span>
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('spaces.createModal.namePlaceholder')}
              required
              maxLength={50}
            />
            <p className="mt-1 text-xs text-[var(--kw-text-muted)]">{name.length}/50</p>
          </div>

          <div>
            <label
              htmlFor={summaryId}
              className="mb-1 block text-sm font-medium text-[var(--kw-text)]"
            >
              {t('spaces.createModal.summaryLabel')}
            </label>
            <textarea
              id={summaryId}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t('spaces.createModal.summaryPlaceholder')}
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-[var(--kw-primary-200)] bg-white px-3 py-2 text-[var(--kw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--kw-primary-400)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-surface-alt)]"
            />
            <p className="mt-1 text-xs text-[var(--kw-text-muted)]">{summary.length}/200</p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="kawaii"
            disabled={isCreating || !name.trim()}
            className="flex-1"
          >
            {isCreating ? t('spaces.createModal.creating') : t('spaces.createSpace')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
