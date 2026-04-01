'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useEvents, useMarkEventRead } from '@/domains/event';
import { Badge } from '@/shared/ui-primitives/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { cn } from '@/lib/utils';

const severityVariantMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  critical: 'warning',
};

function formatRelativeTime(timeString: string) {
  const date = new Date(timeString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {return 'Just now';}
  if (diffMins < 60) {return `${diffMins}m ago`;}
  if (diffHours < 24) {return `${diffHours}h ago`;}
  if (diffDays < 7) {return `${diffDays}d ago`;}
  return date.toLocaleDateString();
}

export default function InboxPage() {
  return (
    <Layout>
      <InboxContent />
    </Layout>
  );
}

function InboxContent() {
  const router = useRouter();
  const { events, isLoading, error, mutate } = useEvents();
  const markEventRead = useMarkEventRead();

  const unreadCount = useMemo(() => events.filter((event) => !event.read_at).length, [events]);

  const handleMarkRead = useCallback(
    async (eventId: string) => {
      try {
        await markEventRead(eventId);
      } finally {
        await mutate();
      }
    },
    [markEventRead, mutate]
  );

  const handleActionNavigate = useCallback(
    (action_url?: string) => {
      if (!action_url) {return;}
      if (action_url.startsWith('/')) {
        router.push(action_url);
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(action_url, '_blank', 'noopener,noreferrer');
      }
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Inbox</p>
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
            Agent feedback, completion events, and system alerts are collected here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="uppercase tracking-wide" variant="info">
            Unread {unreadCount}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-gray-200 bg-white/80 dark:border-[#3D3D5C] dark:bg-[#1A1A2E] py-12 text-sm text-gray-500 dark:text-[#9CA3AF]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading inbox...
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-200 bg-red-50/80 p-6 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/50">
          <AlertCircle className="h-6 w-6" />
          <p className="font-semibold">Unable to load events</p>
          <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
          <Button size="sm" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <Card variant="default">
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">No events to show yet.</p>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              We will surface agent task feedback, expirations, and alerts here as they arrive.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {!isLoading && !error && events.map((event) => (
          <Card
            key={event.id}
            className={cn(
              'border-2 border-transparent',
              !event.read_at && 'border-pink-200 dark:border-pink-500/60'
            )}
          >
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{event.summary}</CardTitle>
                <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-[#9CA3AF]">
                <Badge variant={severityVariantMap[event.severity ?? 'info'] ?? 'info'}>
                  {event.event_type.replace(/[_-]/g, ' ')}
                </Badge>
                <span>Actor: {event.actor_type} {event.actor_id}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                {event.details ?? 'No additional context provided.'}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-gray-500 dark:text-[#9CA3AF]">
                <span>Subject: {event.subject_type} {event.subject_id}</span>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex flex-wrap items-center gap-2">
                {event.action_url && (
                  <Button variant="ghost" size="sm" onClick={() => handleActionNavigate(event.action_url)}>
                    Open action
                  </Button>
                )}
                {!event.read_at && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkRead(event.id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
