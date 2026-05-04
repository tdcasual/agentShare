/**
 * Floating Emojis - 漂浮 emoji 粒子背景
 *
 * 在页面背景上添加缓慢漂浮的 emoji，增强 Kawaii 氛围
 */

'use client';

import { useEffect, useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface FloatingParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface FloatingEmojisProps {
  /** 要显示的 emoji 列表 */
  emojis?: string[];
  /** 粒子数量 */
  count?: number;
  /** 是否只在悬停时显示 */
  hoverOnly?: boolean;
  /** 自定义类名 */
  className?: string;
}

const defaultEmojis = ['🌸', '✨', '💫', '⭐', '🎀', '🌷', '☁️', '🍥', '💎'];

export const FloatingEmojis = memo(function FloatingEmojis({
  emojis = defaultEmojis,
  count = 12,
  hoverOnly = false,
  className,
}: FloatingEmojisProps) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [isVisible, setIsVisible] = useState(!hoverOnly);

  useEffect(() => {
    const items: FloatingParticle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.8 + Math.random() * 0.8,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * -20,
      opacity: 0.15 + Math.random() * 0.2,
    }));
    setParticles(items);
  }, [emojis, count]);

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 overflow-hidden', className)}
      onMouseEnter={() => hoverOnly && setIsVisible(true)}
      onMouseLeave={() => hoverOnly && setIsVisible(false)}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={cn(
            'absolute inline-block transition-opacity duration-1000',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}rem`,
            opacity: isVisible ? p.opacity : 0,
            animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
});

/**
 * 页面顶部的 emoji 装饰条
 */
export function EmojiDivider({
  emojis = ['🌸', '✨', '💫', '⭐', '🎀'],
  className,
}: {
  emojis?: string[];
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-center gap-3 py-4 text-lg opacity-60', className)}
      aria-hidden="true"
    >
      {emojis.map((e, i) => (
        <span
          key={i}
          className="inline-block animate-float"
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: '3s' }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

/**
 * 空状态装饰 - 大 emoji + 文字
 */
export function KawaiiEmpty({
  emoji: emojiChar = '🍃',
  title,
  description,
  className,
}: {
  emoji?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}
    >
      <span className="text-5xl" aria-hidden="true">
        {emojiChar}
      </span>
      {title && <h3 className="text-lg font-semibold text-[var(--kw-text)]">{title}</h3>}
      {description && <p className="max-w-xs text-sm text-[var(--kw-text-muted)]">{description}</p>}
    </div>
  );
}
