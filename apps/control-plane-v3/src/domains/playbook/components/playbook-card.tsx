/**
 * Playbook Card - 手册卡片组件
 * 
 * Kawaii风格，显示手册信息和标签
 */

'use client';

import { Card } from '@/shared/ui-primitives/card';

import type { Playbook } from '../types';
import { BookOpen, Tag, Shield } from 'lucide-react';

interface PlaybookCardProps {
  playbook: Playbook;
  onClick?: (playbook: Playbook) => void;
}

// 标签颜色映射
const tagColors: Record<string, string> = {
  'default': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'urgent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'important': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function PlaybookCard({ playbook, onClick }: PlaybookCardProps) {

  
  // 截断正文预览
  const bodyPreview = playbook.body.length > 120 
    ? playbook.body.slice(0, 120) + '...' 
    : playbook.body;
  
  return (
    <Card 
      variant="kawaii" 
      hover={!!onClick}
      onClick={() => onClick?.(playbook)}
      className="cursor-pointer"
    >
      {/* 头部：图标和类型 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white flex-shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
            {playbook.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {playbook.taskType}
          </p>
        </div>
      </div>
      
      {/* 正文预览 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {bodyPreview}
      </p>
      
      {/* 标签 */}
      {playbook.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {playbook.tags.slice(0, 5).map((tag) => (
            <span 
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                tagColors[tag] || tagColors.default
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {playbook.tags.length > 5 && (
            <span className="text-xs text-gray-400">
              +{playbook.tags.length - 5}
            </span>
          )}
        </div>
      )}
      
      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-pink-100/50 dark:border-[#3D3D5C]">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{playbook.publicationStatus}</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          <span>{playbook.taskType}</span>
        </div>
      </div>
    </Card>
  );
}
