'use client';

import { useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

// Using require for compatibility with react-window ES modules
const { FixedSizeList, VariableSizeList } = require('react-window');
const AutoSizer = require('react-virtualized-auto-sizer').default;

interface ListChildComponentProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
  };
}

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  emptyMessage?: string;
}

// 行组件 - 使用 memo 优化重渲染
const Row = memo(function Row<T>({ 
  index, 
  style, 
  data 
}: ListChildComponentProps<T>) {
  const { items, renderItem } = data;
  const item = items[index];
  
  if (!item) return null;
  
  return (
    <div 
      style={{
        ...style,
        boxSizing: 'border-box',
      }}
      className="px-1"
    >
      {renderItem(item, index)}
    </div>
  );
});

// 主虚拟列表组件
export function VirtualList<T>({ 
  items, 
  rowHeight, 
  renderItem, 
  className,
  overscanCount = 5,
  emptyMessage = '暂无数据'
}: VirtualListProps<T>) {
  //  itemRenderer 包装器
  const itemData = {
    items,
    renderItem,
  };

  // 空状态
  if (items.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full min-h-[200px]',
        'text-gray-500 dark:text-[#9CA3AF]',
        className
      )}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <FixedSizeList
            height={height}
            itemCount={items.length}
            itemSize={rowHeight}
            width={width}
            itemData={itemData}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent"
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
}

// 可变高度虚拟列表 (用于内容高度不一致的场景)
interface VariableSizeVirtualListProps<T> {
  items: T[];
  getItemHeight: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  emptyMessage?: string;
}

export function VariableSizeVirtualList<T>({ 
  items, 
  getItemHeight, 
  renderItem, 
  className,
  overscanCount = 5,
  emptyMessage = '暂无数据'
}: VariableSizeVirtualListProps<T>) {
  const itemData = {
    items,
    renderItem,
  };

  if (items.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full min-h-[200px]',
        'text-gray-500 dark:text-[#9CA3AF]',
        className
      )}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <VariableSizeList
            height={height}
            itemCount={items.length}
            itemSize={getItemHeight}
            width={width}
            itemData={itemData}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent"
          >
            {Row}
          </VariableSizeList>
        )}
      </AutoSizer>
    </div>
  );
}

export default VirtualList;
