'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Identity, HumanIdentity, AgentIdentity } from '../../../shared/types';
import { Card, CardContent } from '../../../shared/ui-primitives/card';
import { Badge } from '../../../shared/ui-primitives/badge';
import { SparkleEffect } from '@/components/kawaii/sparkle-effect';
import { useI18n } from '@/components/i18n-provider';

interface IdentityCardProps {
  identity: Identity;
  onClick?: () => void;
  className?: string;
}

export function IdentityCard({ identity, onClick, className }: IdentityCardProps) {
  const { t } = useI18n();
  const isHuman = identity.type === 'human';
  const isAgent = identity.type === 'agent';

  const presenceColors = {
    online: 'bg-[var(--kw-agent-accent)]',
    away: 'bg-[var(--kw-warning)]',
    busy: 'bg-[var(--kw-error)]',
    offline: 'bg-[var(--kw-text-muted)]',
  };

  return (
    <Card
      hover
      decoration
      className={cn(
        'cursor-pointer transition-shadow transition-transform duration-300',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar with effects */}
          <SparkleEffect>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={identity.profile.avatar}
                alt={identity.profile.name}
                loading="lazy"
                decoding="async"
                className={cn(
                  'border-3 h-16 w-16 rounded-full object-cover shadow-md',
                  isHuman ? 'border-[var(--kw-human-accent)]' : 'border-[var(--kw-agent-accent)]',
                  identity.presence === 'online' && 'shadow-[var(--kw-agent-accent)]/30 shadow-lg'
                )}
              />
              {/* Presence indicator with pulse */}
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-white',
                  presenceColors[identity.presence],
                  identity.presence === 'online' && 'ring-[var(--kw-agent-accent)]/40 ring-2'
                )}
              />
              {/* Type badge */}
              <span
                className={cn(
                  'absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs shadow-sm',
                  isHuman
                    ? 'bg-[var(--kw-sky)] text-white'
                    : 'bg-[var(--kw-agent-accent)] text-white'
                )}
              >
                {isHuman ? '👤' : '🤖'}
              </span>
            </div>
          </SparkleEffect>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate font-bold text-[var(--kw-text)]">{identity.profile.name}</h3>
              <Badge variant={isHuman ? 'human' : 'agent'}>
                {isHuman ? t('common.human') : t('common.agent')}
              </Badge>
            </div>

            {identity.profile.bio && (
              <p className="mb-2 line-clamp-2 text-sm text-[var(--kw-text-muted)]">
                {identity.profile.bio}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {identity.profile.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--kw-border)] bg-[var(--kw-primary-50)] px-2.5 py-0.5 text-xs text-[var(--kw-primary-600)]"
                >
                  {tag}
                </span>
              ))}
              {identity.profile.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-[var(--kw-text-muted)]">
                  +{identity.profile.tags.length - 3}
                </span>
              )}
            </div>

            {/* Agent-specific info */}
            {isAgent && (identity as AgentIdentity).runtime && (
              <div className="mt-3 flex items-center gap-3 text-xs text-[var(--kw-text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--kw-agent-accent)]" />
                  {(identity as AgentIdentity).runtime!.adapterType}
                </span>
                <span className="text-[var(--kw-primary-300)]">✦</span>
                <span>max {(identity as AgentIdentity).runtime!.maxConcurrent} concurrent</span>
              </div>
            )}

            {/* Human-specific info */}
            {isHuman && (
              <div className="mt-3 flex items-center gap-3 text-xs text-[var(--kw-text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--kw-sky)]" />
                  {(identity as HumanIdentity).session?.managementRole || 'member'}
                </span>
                <span className="text-[var(--kw-primary-300)]">✦</span>
                <span>{(identity as HumanIdentity).profile.timezone || 'UTC'}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
