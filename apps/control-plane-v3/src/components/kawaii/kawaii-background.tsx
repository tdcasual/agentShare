'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const DECORATIONS = ['🌸', '✨', '💕', '🎀', '🌟', '💖', '🌷', '💫'];
const DARK_DECORATIONS = ['🌙', '⭐', '✨', '💫', '🌸', '🦋', '🔮', '🌌'];

interface FloatingItem {
  id: number;
  emoji: string;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: string;
}

export function KawaiiBackground() {
  const { resolvedTheme } = useTheme();
  const [items, setItems] = useState<FloatingItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    const decorations = isDark ? DARK_DECORATIONS : DECORATIONS;

    const generated = [...Array(12)].map((_, i) => ({
      id: i,
      emoji: decorations[i % decorations.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${4 + Math.random() * 3}s`,
      size: `${1.5 + Math.random() * 1.5}rem`,
    }));
    setItems(generated);
  }, [resolvedTheme]);

  if (!mounted) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-purple-50/60 to-blue-50/80" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft gradient overlay - changes based on theme */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark
            ? 'bg-gradient-to-br from-[#1A1A2E]/90 via-[#252540]/80 to-[#1E1E36]/90'
            : 'bg-gradient-to-br from-pink-50/80 via-purple-50/60 to-blue-50/80'
        }`}
      />

      {/* Floating decorations */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-float select-none"
          style={{
            left: item.left,
            top: item.top,
            animationDelay: item.delay,
            animationDuration: item.duration,
            fontSize: item.size,
            opacity: isDark ? 0.1 : 0.15,
          }}
          aria-hidden="true"
        >
          {item.emoji}
        </div>
      ))}

      {/* Soft orb decorations - softer in dark mode */}
      <div
        className={`absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full blur-3xl transition-colors duration-500 ${
          isDark ? 'bg-[#E891C0]/5' : 'bg-pink-200/20'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl transition-colors duration-500 ${
          isDark ? 'bg-[#6B9AC4]/5' : 'bg-purple-200/20'
        }`}
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
}
