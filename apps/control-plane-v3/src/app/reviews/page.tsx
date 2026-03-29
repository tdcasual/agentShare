'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { ApiError, api } from '@/lib/api';
import { useManagementSessionGate } from '@/lib/session';
import type { ReviewQueueItem } from '@/shared/types';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';

export default function ReviewsPage() {
  return (
    <Layout>
      <ReviewsContent />
    </Layout>
  );
}

function ReviewsContent() {
  const { session, loading: gateLoading, error: gateError } = useManagementSessionGate();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const queue = await api.getReviews();
        if (!cancelled) {
          setItems(queue.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load review queue');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce, session]);

  const countByKind = useMemo(() => {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.resource_kind] = (accumulator[item.resource_kind] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [items]);

  async function handleDecision(item: ReviewQueueItem, decision: 'approve' | 'reject') {
    const nextActionKey = `${decision}:${item.resource_kind}:${item.resource_id}`;
    setActionKey(nextActionKey);
    setError(null);

    try {
      if (decision === 'approve') {
        await api.approveReview(item.resource_kind, item.resource_id);
      } else {
        await api.rejectReview(item.resource_kind, item.resource_id);
      }
      setRefreshNonce((current) => current + 1);
    } catch (decisionError) {
      if (decisionError instanceof ApiError) {
        setError(decisionError.detail);
      } else {
        setError(decisionError instanceof Error ? decisionError.message : 'Failed to update review item');
      }
    } finally {
      setActionKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-pink-700 border border-pink-100">
            <ShieldAlert className="h-4 w-4" />
            Human review gate
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pending reviews</h1>
            <p className="mt-1 text-gray-600">
              Agent-published assets stay inactive until a human operator approves or rejects them here.
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={() => setRefreshNonce((current) => current + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh queue
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending items" value={items.length.toString()} />
        <MetricCard label="Tasks queued" value={(countByKind.task ?? 0).toString()} />
        <MetricCard label="Playbooks queued" value={(countByKind.playbook ?? 0).toString()} />
        <MetricCard label="Secrets + capabilities" value={((countByKind.secret ?? 0) + (countByKind.capability ?? 0)).toString()} />
      </div>

      <Card className="border border-pink-100 bg-white/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Badge variant="primary">Reviewer</Badge>
          <span>{session?.email ?? 'Loading session...'}</span>
          <span className="text-gray-300">•</span>
          <span>{session?.role ?? '...'}</span>
          <span className="text-gray-300">•</span>
          <span>Only pending runtime submissions appear here.</span>
        </div>
      </Card>

      {gateError || error ? (
        <Card className="border border-red-100 bg-red-50/80 text-red-700">
          {gateError ?? error}
        </Card>
      ) : null}

      {gateLoading || loading ? (
        <Card className="text-gray-600">Loading pending review items...</Card>
      ) : null}

      {!gateLoading && !loading && items.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800">Review queue is clear</h2>
            <p className="text-gray-600">All pending agent-submitted assets have already been handled.</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.map((item) => {
          const busy = actionKey !== null;
          const approveKey = `approve:${item.resource_kind}:${item.resource_id}`;
          const rejectKey = `reject:${item.resource_kind}:${item.resource_id}`;

          return (
            <Card key={`${item.resource_kind}:${item.resource_id}`} variant="kawaii" className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{item.publication_status}</Badge>
                    <Badge variant="secondary">{item.resource_kind}</Badge>
                    {item.created_via_token_id ? <Badge variant="default">{item.created_via_token_id}</Badge> : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{item.title}</h2>
                    <p className="text-sm text-gray-500">Resource ID: {item.resource_id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    loading={actionKey === rejectKey}
                    disabled={busy}
                    onClick={() => handleDecision(item, 'reject')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    loading={actionKey === approveKey}
                    disabled={busy}
                    onClick={() => handleDecision(item, 'approve')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ReviewStat
                  icon={<Clock3 className="h-4 w-4 text-pink-500" />}
                  label="Submitted by"
                  value={`${item.created_by_actor_type}:${item.created_by_actor_id}`}
                />
                <ReviewStat
                  icon={<ShieldAlert className="h-4 w-4 text-pink-500" />}
                  label="Token provenance"
                  value={item.created_via_token_id ?? 'Created directly by human'}
                />
                <ReviewStat
                  icon={<ShieldCheck className="h-4 w-4 text-pink-500" />}
                  label="Last review"
                  value={item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : 'Awaiting first decision'}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </Card>
  );
}

function ReviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800 break-all">{value}</p>
    </div>
  );
}
