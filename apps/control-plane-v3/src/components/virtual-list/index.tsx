'use client';

import { memo } from 'react';
import { List as ReactWindowList } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';

const FixedSizeList = ReactWindowList as unknown as React.ComponentType<Record<string, unknown>>;
const VariableSizeList = ReactWindowList as unknown as React.ComponentType<Record<string, unknown>>;

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
const Row = memo(function Row<T>({ index, style, data }: ListChildComponentProps<T>) {
  const { items, renderItem } = data;
  const item = items[index];

  if (!item) {
    return null;
  }

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
  emptyMessage = '暂无数据',
}: VirtualListProps<T>) {
  //  itemRenderer 包装器
  const itemData = {
    items,
    renderItem,
  };

  // 空状态
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[200px] items-center justify-center',
          'text-gray-500 dark:text-[#9CA3AF]',
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer
        renderProp={({ height, width }) => (
          <FixedSizeList
            height={height ?? 0}
            itemCount={items.length}
            itemSize={rowHeight}
            width={width ?? 0}
            itemData={itemData}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent"
          >
            {Row}
          </FixedSizeList>
        )}
      />
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
  emptyMessage = '暂无数据',
}: VariableSizeVirtualListProps<T>) {
  const itemData = {
    items,
    renderItem,
  };

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[200px] items-center justify-center',
          'text-gray-500 dark:text-[#9CA3AF]',
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <AutoSizer
        renderProp={({ height, width }) => (
          <VariableSizeList
            height={height ?? 0}
            itemCount={items.length}
            itemSize={getItemHeight}
            width={width ?? 0}
            itemData={itemData}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent"
          >
            {Row}
          </VariableSizeList>
        )}
      />
    </div>
  );
}

export default VirtualList;
