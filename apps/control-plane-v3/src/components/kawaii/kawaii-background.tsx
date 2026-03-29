'use client';

import { useEffect, useState } from 'react';

const DECORATIONS = ['🌸', '✨', '💕', '🎀', '🌟', '💖', '🌷', '💫'];

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
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    const generated = [...Array(12)].map((_, i) => ({
      id: i,
      emoji: DECORATIONS[i % DECORATIONS.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${4 + Math.random() * 3}s`,
      size: `${1.5 + Math.random() * 1.5}rem`,
    }));
    setItems(generated);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-purple-50/60 to-blue-50/80" />
      
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
            opacity: 0.15,
          }}
        >
          {item.emoji}
        </div>
      ))}
      
      {/* Soft orb decorations */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-200/20 rounded-full blur-3xl animate-pulse" />
      <div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" 
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
}
