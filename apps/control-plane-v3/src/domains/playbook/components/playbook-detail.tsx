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
import { 
  BookOpen, 
  Tag, 
  Shield,
  X,
  Copy,
  CheckCircle
} from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card 
        variant="kawaii" 
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-start justify-between p-6 border-b border-pink-100 dark:border-[#3D3D5C]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {playbook.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {playbook.taskType}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 标签 */}
          {playbook.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {playbook.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* 正文 */}
          <div className="relative">
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBody}
                leftIcon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
            <div className="bg-pink-50/50 dark:bg-[#1A1A2E] rounded-xl p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                {playbook.body}
              </pre>
            </div>
          </div>
          
          {/* 元信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span>任务类型: {playbook.taskType}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>发布状态: {playbook.publicationStatus}</span>
            </div>
          </div>
        </div>
        
        {/* 底部 */}
        <div className="p-6 border-t border-pink-100 dark:border-[#3D3D5C] flex justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </Card>
    </div>
  );
}
