/**
 * Playbook Detail - 手册详情组件
 *
 * 显示完整的手册内容
 */

'use client';

import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Badge } from '@/shared/ui-primitives/badge';
import type { Playbook } from '../types';
import { BookOpen, Tag, Shield, X, Copy, CheckCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PlaybookDetailProps {
  playbook: Playbook;
  onClose: () => void;
}

export function PlaybookDetail({ playbook, onClose }: PlaybookDetailProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(playbook.body);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card
        variant="kawaii"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-start justify-between border-b border-pink-100 p-6 dark:border-[#3D3D5C]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 text-white">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {playbook.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{playbook.taskType}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* 标签 */}
          {playbook.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {playbook.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 正文 */}
          <div className="relative">
            <div className="absolute right-2 top-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBody}
                leftIcon={
                  copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />
                }
              >
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
            <div className="rounded-xl bg-pink-50/50 p-4 dark:bg-[#1A1A2E]">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {playbook.body}
              </pre>
            </div>
          </div>

          {/* 元信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <BookOpen className="h-4 w-4" />
              <span>任务类型: {playbook.taskType}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>发布状态: {playbook.publicationStatus}</span>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end border-t border-pink-100 p-6 dark:border-[#3D3D5C]">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </Card>
    </div>
  );
}
