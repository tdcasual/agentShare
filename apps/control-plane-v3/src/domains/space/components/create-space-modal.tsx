/**
 * Create Space Modal - 创建空间模态框
 */

'use client';

import { useState } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { Globe, X } from 'lucide-react';

interface CreateSpaceModalProps {
  onClose: () => void;
  onCreate: (input: { name: string; summary: string }) => Promise<void>;
  isCreating: boolean;
}

export function CreateSpaceModal({ onClose, onCreate, isCreating }: CreateSpaceModalProps) {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({ name, summary });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card variant="kawaii" className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-purple-text)] text-white">
                <Globe className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-[var(--kw-text)]">创建空间</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* 表单 */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--kw-text)]">
                空间名称 <span className="text-[var(--kw-error)]">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入空间名称"
                required
                maxLength={50}
              />
              <p className="mt-1 text-xs text-[var(--kw-text-muted)]">{name.length}/50</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--kw-text)]">
                描述
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述这个空间的用途..."
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
              取消
            </Button>
            <Button
              type="submit"
              variant="kawaii"
              disabled={isCreating || !name.trim()}
              className="flex-1"
            >
              {isCreating ? '创建中...' : '创建空间'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
