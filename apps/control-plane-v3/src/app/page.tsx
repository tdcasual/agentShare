'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '../interfaces/human/layout';
import { useRuntime } from '../core/runtime';
import { IdentityRegistryServiceId } from '../domains/identity/services/identity-registry';
import { IdentityCard, IdentityCardCompact } from '../domains/identity/components/identity-card';
import type { Identity } from '../shared/types';
import { Card } from '../shared/ui-primitives/card';
import { Button } from '../shared/ui-primitives/button';
import { Badge } from '../shared/ui-primitives/badge';
import { resolveAppEntryState, type AppEntryState } from '@/lib/session';
import { useI18n } from '@/components/i18n-provider';
import {
  Users, Bot, Globe, Zap, CheckSquare,
  TrendingUp, Clock, ArrowRight, Sparkles, KeyRound, ShieldCheck
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function HubPage() {
  const router = useRouter();
  const { t } = useI18n();
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
          setError(loadError instanceof Error ? loadError.message : t('hub.loadingError'));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card variant="feature" className="max-w-lg w-full text-center space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Control Plane V3</p>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('hub.unableToOpen')}</h1>
            <p className="text-gray-600 dark:text-[#9CA3AF]">{error}</p>
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('hub.routing')}</h1>
            <p className="text-gray-600 dark:text-[#9CA3AF]">{t('hub.checkingStatus')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <HubContent email={entryState.session.email ?? ''} role={entryState.session.role} />
    </Layout>
  );
}

function HubContent({ email, role }: { email: string; role: string }) {
  const { t } = useI18n();
  const runtime = useRuntime();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    humans: 0,
    agents: 0,
    spaces: 12,
    tasksToday: 48,
  });

  useEffect(() => {
    const registry = runtime.di.resolve(IdentityRegistryServiceId);
    const allIdentities = registry.getAll();

    setIdentities(allIdentities);
    setStats({
      humans: allIdentities.filter((identity) => identity.type === 'human').length,
      agents: allIdentities.filter((identity) => identity.type === 'agent').length,
      spaces: 12,
      tasksToday: 48,
    });

    // 安全地生成活动数据，防止数组越界
    const safeActor = (index: number) => allIdentities[index] || allIdentities[0] || {
      id: 'unknown',
      profile: { name: t('identities.type.human'), avatar: '', bio: '', tags: [], createdAt: new Date() },
      type: 'human',
      presence: 'offline',
      status: 'active',
    };

    setRecentActivity([
      { id: 1, type: 'task', actor: safeActor(1), action: t('hub.activity.completedTask'), target: 'API Deployment', time: '2m ago' },
      { id: 2, type: 'review', actor: safeActor(0), action: t('hub.activity.approvedAsset'), target: 'queued playbook', time: '5m ago' },
      { id: 3, type: 'token', actor: safeActor(2), action: t('hub.activity.publishedToken'), target: 'staging-worker', time: '1h ago' },
      { id: 4, type: 'asset', actor: safeActor(0), action: t('hub.activity.createdAsset'), target: 'Production Config', time: '2h ago' },
    ]);
  }, [runtime, t]);

  const humans = identities.filter((identity) => identity.type === 'human');
  const agents = identities.filter((identity) => identity.type === 'agent');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
            {t('hub.welcome')} <span className="gradient-text">{t('hub.dualCosmos')}</span>
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            {t('hub.signedInAs')} {email} {t('hub.withRole')} {role} {t('hub.access')}
          </p>
        </div>
        <Link href="/tokens">
          <Button variant="gradient" size="lg">
            <Sparkles className="w-5 h-5 mr-2" />
            {t('hub.openTokenOps')}
          </Button>
        </Link>
      </div>

      <Card className="p-4 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
          <Badge variant="primary">{t('hub.inviteOnly')}</Badge>
          <span>{t('hub.publicRegistrationClosed')}</span>
          <span className="text-gray-300">•</span>
          <span>{t('hub.runtimeTokens')}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-sky-600" />}
          label={t('identities.humans')}
          value={stats.humans}
          trend={t('hub.stats.humansTrend')}
          color="sky"
        />
        <StatCard
          icon={<Bot className="w-6 h-6 text-green-600" />}
          label={t('identities.agents')}
          value={stats.agents}
          trend={t('hub.stats.agentsTrend')}
          color="green"
        />
        <StatCard
          icon={<KeyRound className="w-6 h-6 text-purple-600" />}
          label={t('navigation.tokens')}
          value={4}
          trend={t('hub.stats.tokensTrend')}
          color="purple"
        />
        <StatCard
          icon={<CheckSquare className="w-6 h-6 text-orange-600" />}
          label={t('hub.tasksToday')}
          value={stats.tasksToday}
          trend={t('hub.stats.tasksTrend')}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('identities.title')}</h2>
              <div className="flex gap-2">
                <Badge variant="human">{humans.length} {t('identities.humans')}</Badge>
                <Badge variant="agent">{agents.length} {t('identities.agents')}</Badge>
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
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('hub.recentActivity')}</h2>
              <Link href="/reviews">
                <Button variant="ghost" size="sm">
                  {t('navigation.reviews')} <ArrowRight className="w-4 h-4 ml-1" />
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
                      <p className="text-sm text-gray-800 dark:text-[#E8E8EC]">
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
            <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-4">{t('hub.quickActions')}</h3>
            <div className="space-y-3">
              <ActionButton href="/tasks" icon={<Zap className="w-4 h-4" />} label={t('hub.publishTask')} />
              <ActionButton href="/tokens" icon={<KeyRound className="w-4 h-4" />} label={t('hub.manageTokens')} />
              <ActionButton href="/reviews" icon={<ShieldCheck className="w-4 h-4" />} label={t('hub.reviewQueue')} />
              <ActionButton href="/settings" icon={<Users className="w-4 h-4" />} label={t('hub.inviteAdmin')} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-4">{t('hub.onlineNow')}</h3>
            <div className="space-y-2">
              {identities.filter((identity) => identity.presence === 'online').map((identity) => (
                <IdentityCardCompact key={identity.id} identity={identity} />
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-semibold text-green-800">{t('hub.controlSurfaceReady')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-green-700">
                <span>{t('hub.bootstrap')}</span>
                <span className="font-medium">{t('hub.initialized')}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>{t('hub.managementSession')}</span>
                <span className="font-medium">{t('hub.active')}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>{t('hub.reviewGate')}</span>
                <span className="font-medium">{t('hub.enabled')}</span>
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
        <p className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
        <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{trend}</p>
      </div>
    </Card>
  );
}

function ActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-[#E8E8EC] hover:bg-pink-50 transition-colors text-left">
      <span className="text-pink-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
