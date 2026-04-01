'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Identity, HumanIdentity, AgentIdentity } from '../../../shared/types';
import { Card, CardContent } from '../../../shared/ui-primitives/card';
import { Badge } from '../../../shared/ui-primitives/badge';
import { SparkleEffect } from '@/components/kawaii/sparkle-effect';

interface IdentityCardProps {
  identity: Identity;
  onClick?: () => void;
  className?: string;
}

export function IdentityCard({ identity, onClick, className }: IdentityCardProps) {
  const isHuman = identity.type === 'human';
  const isAgent = identity.type === 'agent';
  
  const presenceColors = {
    online: 'bg-green-400',
    away: 'bg-yellow-400',
    busy: 'bg-red-400',
    offline: 'bg-gray-300',
  };

  return (
    <Card 
      hover 
      decoration
      className={cn(
        'cursor-pointer transition-all duration-300',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar with effects */}
          <SparkleEffect>
            <div className="relative">
              <img
                src={identity.profile.avatar}
                alt={identity.profile.name}
                className={cn(
                  'w-16 h-16 rounded-full object-cover border-3 shadow-md',
                  isHuman ? 'border-sky-300' : 'border-green-300',
                  identity.presence === 'online' && 'shadow-lg shadow-green-200'
                )}
              />
              {/* Presence indicator with pulse */}
              <span 
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white',
                  presenceColors[identity.presence],
                  identity.presence === 'online' && 'animate-pulse'
                )}
              />
              {/* Type badge */}
              <span className={cn(
                'absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm',
                isHuman ? 'bg-sky-400 text-white' : 'bg-green-400 text-white'
              )}>
                {isHuman ? '👤' : '🤖'}
              </span>
            </div>
          </SparkleEffect>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 truncate">
                {identity.profile.name}
              </h3>
              <Badge variant={isHuman ? 'human' : 'agent'}>
                {isHuman ? 'Human' : 'Agent'}
              </Badge>
            </div>
            
            {identity.profile.bio && (
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mb-2 line-clamp-2">
                {identity.profile.bio}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {identity.profile.tags.slice(0, 3).map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100"
                >
                  {tag}
                </span>
              ))}
              {identity.profile.tags.length > 3 && (
                <span className="text-xs px-2 py-0.5 text-gray-400">
                  +{identity.profile.tags.length - 3}
                </span>
              )}
            </div>

            {/* Agent-specific info */}
            {isAgent && (identity as AgentIdentity).runtime && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-[#9CA3AF]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {(identity as AgentIdentity).runtime!.adapterType}
                </span>
                <span className="text-pink-300">✦</span>
                <span>max {(identity as AgentIdentity).runtime!.maxConcurrent} concurrent</span>
              </div>
            )}

            {/* Human-specific info */}
            {isHuman && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-[#9CA3AF]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  {(identity as HumanIdentity).session?.managementRole || 'member'}
                </span>
                <span className="text-pink-300">✦</span>
                <span>{(identity as HumanIdentity).profile.timezone || 'UTC'}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function IdentityCardCompact({ identity, onClick }: { identity: Identity; onClick?: () => void }) {
  const isHuman = identity.type === 'human';
  const isOnline = identity.presence === 'online';
  const interactiveProps = onClick
    ? {
        onClick,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        },
        role: 'button' as const,
        tabIndex: 0,
      }
    : {};
  
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-pink-50/50 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      {...interactiveProps}
    >
      <div className="relative">
        <img
          src={identity.profile.avatar}
          alt={identity.profile.name}
          className={cn(
            'w-10 h-10 rounded-full object-cover border-2',
            isHuman ? 'border-sky-300' : 'border-green-300',
            isOnline && 'shadow-md shadow-green-100'
          )}
        />
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {identity.profile.name}
          </span>
          <span className="text-xs opacity-60">
            {isHuman ? '👤' : '🤖'}
          </span>
        </div>
        <span className={cn(
          'text-xs',
          isOnline ? 'text-green-600' : 'text-gray-400'
        )}>
          {isOnline ? '● online' : identity.presence}
        </span>
      </div>
    </div>
  );
}
