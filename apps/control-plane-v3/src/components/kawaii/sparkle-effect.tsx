'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Sparkle {
  id: string;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface SparkleEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function SparkleEffect({ children, className }: SparkleEffectProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovering(true);
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const newSparkles = [...Array(4)].map(() => ({
      id: Math.random().toString(36).slice(2),
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 0.3,
    }));
    setSparkles(newSparkles);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    timeoutRef.current = setTimeout(() => setSparkles([]), 500);
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      role="presentation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className={cn(
            'absolute pointer-events-none transition-all duration-500',
            isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          )}
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            fontSize: `${sparkle.size}rem`,
            transitionDelay: `${sparkle.delay}s`,
          }}
        >
          ✨
        </span>
      ))}
    </div>
  );
}
