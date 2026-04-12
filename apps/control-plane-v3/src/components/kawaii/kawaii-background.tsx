'use client';

import { memo, useMemo } from 'react';
import { useTheme } from 'next-themes';

const DECORATIONS = ['🌸', '✨', '💕', '🎀', '🌟', '💖', '🌷', '💫'];
const DARK_DECORATIONS = ['🌙', '⭐', '✨', '💫', '🌸', '🦋', '🔮', '🌌'];

// Deterministic pseudo-random generator for stable SSR/CSR match
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateItems(seed: number) {
  const rand = mulberry32(seed);
  return [...Array(12)].map((_, i) => ({
    id: i,
    left: `${rand() * 100}%`,
    top: `${rand() * 100}%`,
    delay: `${rand() * 5}s`,
    duration: `${4 + rand() * 3}s`,
    size: `${1.5 + rand() * 1.5}rem`,
  }));
}

// Pre-compute stable positions so they never change across renders or themes
const STABLE_ITEMS = generateItems(42);

export const KawaiiBackground = memo(function KawaiiBackground() {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const decorations = isDark ? DARK_DECORATIONS : DECORATIONS;

  // Memoize emojis so we only recompute the mapping, not positions
  const items = useMemo(
    () =>
      STABLE_ITEMS.map((item, i) => ({
        ...item,
        emoji: decorations[i % decorations.length],
      })),
    [decorations]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-background overflow-hidden">
      {/* Soft gradient overlay - changes based on theme */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark
            ? 'from-[var(--kw-dark-bg)]/90 via-[var(--kw-dark-surface)]/80 to-[var(--kw-dark-bg)]/90 bg-gradient-to-br'
            : 'bg-gradient-to-br from-[var(--kw-primary-50)]/80 via-[var(--kw-lavender)]/60 to-[var(--kw-sky-surface)]/80'
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
          isDark ? 'bg-[var(--kw-dark-primary)]/5' : 'bg-[var(--kw-primary-200)]/20'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl transition-colors duration-500 ${
          isDark ? 'bg-[var(--kw-dark-sky)]/5' : 'bg-[var(--kw-lavender)]/40'
        }`}
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
});
