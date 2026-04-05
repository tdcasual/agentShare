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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card variant="kawaii" className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                创建空间
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 表单 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                空间名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入空间名称"
                required
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-1">{name.length}/50</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述这个空间的用途..."
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-[#3D3D5C] bg-white dark:bg-[#1A1A2E] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{summary.length}/200</p>
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
