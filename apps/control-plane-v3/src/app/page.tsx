'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '../interfaces/human/layout';
import { getRuntime } from '../core/runtime';
import { IdentityRegistryServiceId } from '../domains/identity/services/identity-registry';
import { IdentityCard, IdentityCardCompact } from '../domains/identity/components/identity-card';
import type { Identity } from '../shared/types';
import { Card } from '../shared/ui-primitives/card';
import { Button } from '../shared/ui-primitives/button';
import { Badge } from '../shared/ui-primitives/badge';
import { resolveAppEntryState, type AppEntryState } from '@/lib/session';
import {
  Users, Bot, Globe, Zap, CheckSquare,
  TrendingUp, Clock, ArrowRight, Sparkles, KeyRound, ShieldCheck
} from 'lucide-react';

export default function HubPage() {
  const router = useRouter();
  const [entryState, setEntryState] = useState<AppEntryState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextState = await resolveAppEntryState();
        if (cancelled) {
          return;
        }
        setEntryState(nextState);
        if (nextState.kind === 'setup') {
          router.replace('/setup');
          return;
        }
        if (nextState.kind === 'login') {
          router.replace('/login');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to resolve entry state');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card variant="feature" className="max-w-lg w-full text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Control Plane V3</p>
            <h1 className="text-3xl font-bold text-gray-800">Unable to open the console</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!entryState || entryState.kind !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card variant="feature" className="max-w-lg w-full text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Control Plane V3</p>
            <h1 className="text-3xl font-bold text-gray-800">Routing you to the right control surface</h1>
            <p className="text-gray-600">Checking bootstrap status and current management session...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <HubContent email={entryState.session.email} role={entryState.session.role} />
    </Layout>
  );
}

function HubContent({ email, role }: { email: string; role: string }) {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    humans: 0,
    agents: 0,
    spaces: 12,
    tasksToday: 48,
  });

  useEffect(() => {
    const runtime = getRuntime();
    const registry = runtime.di.resolve(IdentityRegistryServiceId);
    const allIdentities = registry.getAll();

    setIdentities(allIdentities);
    setStats({
      humans: allIdentities.filter((identity) => identity.type === 'human').length,
      agents: allIdentities.filter((identity) => identity.type === 'agent').length,
      spaces: 12,
      tasksToday: 48,
    });

    setRecentActivity([
      { id: 1, type: 'task', actor: allIdentities[1], action: 'completed task', target: 'API Deployment', time: '2m ago' },
      { id: 2, type: 'review', actor: allIdentities[0], action: 'approved asset', target: 'queued playbook', time: '5m ago' },
      { id: 3, type: 'token', actor: allIdentities[2], action: 'published token', target: 'staging-worker', time: '1h ago' },
      { id: 4, type: 'asset', actor: allIdentities[0], action: 'created asset', target: 'Production Config', time: '2h ago' },
    ]);
  }, []);

  const humans = identities.filter((identity) => identity.type === 'human');
  const agents = identities.filter((identity) => identity.type === 'agent');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to <span className="gradient-text">Dual Cosmos</span>
          </h1>
          <p className="text-gray-600">
            Signed in as {email} with {role} access. Bootstrap, tokens, reviews, and tasks are now all live.
          </p>
        </div>
        <Link href="/tokens">
          <Button variant="gradient" size="lg">
            <Sparkles className="w-5 h-5 mr-2" />
            Open Token Ops
          </Button>
        </Link>
      </div>

      <Card className="p-4 border border-pink-100 bg-white/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Badge variant="primary">Invite-only management</Badge>
          <span>Public registration is closed after first-run owner bootstrap.</span>
          <span className="text-gray-300">•</span>
          <span>Runtime tokens are managed separately from human sessions.</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-sky-600" />}
          label="Humans"
          value={stats.humans}
          trend="+1 invited this week"
          color="sky"
        />
        <StatCard
          icon={<Bot className="w-6 h-6 text-green-600" />}
          label="Agents"
          value={stats.agents}
          trend="managed by tokens"
          color="green"
        />
        <StatCard
          icon={<KeyRound className="w-6 h-6 text-purple-600" />}
          label="Token Ops"
          value={4}
          trend="issue, revoke, review"
          color="purple"
        />
        <StatCard
          icon={<CheckSquare className="w-6 h-6 text-orange-600" />}
          label="Tasks Today"
          value={stats.tasksToday}
          trend="token-targeted flow"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Identity Universe</h2>
              <div className="flex gap-2">
                <Badge variant="human">{humans.length} Humans</Badge>
                <Badge variant="agent">{agents.length} Agents</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {identities.map((identity, index) => (
                <div
                  key={identity.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <IdentityCard identity={identity} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
              <Link href="/reviews">
                <Button variant="ghost" size="sm">
                  Review queue <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-pink-100">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 flex items-center gap-4 hover:bg-pink-50/30 transition-colors"
                  >
                    <img
                      src={activity.actor.profile.avatar}
                      alt={activity.actor.profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{activity.actor.profile.name}</span>
                        {' '}{activity.action}{' '}
                        {activity.target && (
                          <span className="text-pink-600">{activity.target}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                    </div>
                    <Badge
                      variant={activity.type === 'task' ? 'success' : activity.type === 'review' ? 'warning' : 'default'}
                      className="flex-shrink-0"
                    >
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <ActionButton href="/tasks" icon={<Zap className="w-4 h-4" />} label="Publish Task" />
              <ActionButton href="/tokens" icon={<KeyRound className="w-4 h-4" />} label="Manage Tokens" />
              <ActionButton href="/reviews" icon={<ShieldCheck className="w-4 h-4" />} label="Review Queue" />
              <ActionButton href="/settings" icon={<Users className="w-4 h-4" />} label="Invite Admin" />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Online Now</h3>
            <div className="space-y-2">
              {identities.filter((identity) => identity.presence === 'online').map((identity) => (
                <IdentityCardCompact key={identity.id} identity={identity} />
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-semibold text-green-800">Control Surface Ready</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-green-700">
                <span>Bootstrap</span>
                <span className="font-medium">Initialized</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Management Session</span>
                <span className="font-medium">Active</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Review Gate</span>
                <span className="font-medium">Enabled</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend: string;
  color: 'sky' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="p-4 flex items-center gap-4 hover:shadow-medium transition-shadow">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', colorClasses[color])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{trend}</p>
      </div>
    </Card>
  );
}

function ActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-pink-50 transition-colors text-left">
      <span className="text-pink-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
