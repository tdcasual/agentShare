'use client';

import { useEffect, useState } from 'react';
import { Layout } from '../interfaces/human/layout';
import { getRuntime } from '../core/runtime';
import { IdentityRegistryServiceId } from '../domains/identity/services/identity-registry';
import { IdentityCard, IdentityCardCompact } from '../domains/identity/components/identity-card';
import type { Identity } from '../shared/types';
import { Card } from '../shared/ui-primitives/card';
import { Button } from '../shared/ui-primitives/button';
import { Badge } from '../shared/ui-primitives/badge';
import { 
  Users, Bot, Globe, Zap, CheckSquare, 
  TrendingUp, Clock, ArrowRight, Sparkles 
} from 'lucide-react';

export default function HubPage() {
  return (
    <Layout>
      <HubContent />
    </Layout>
  );
}

function HubContent() {
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
      humans: allIdentities.filter(i => i.type === 'human').length,
      agents: allIdentities.filter(i => i.type === 'agent').length,
      spaces: 12,
      tasksToday: 48,
    });

    // Mock activity data
    setRecentActivity([
      { id: 1, type: 'task', actor: allIdentities[1], action: 'completed task', target: 'API Deployment', time: '2m ago' },
      { id: 2, type: 'mention', actor: allIdentities[0], action: 'mentioned you in', target: '#project-alpha', time: '5m ago' },
      { id: 3, type: 'join', actor: allIdentities[2], action: 'joined workspace', target: '', time: '1h ago' },
      { id: 4, type: 'asset', actor: allIdentities[0], action: 'created asset', target: 'Production Config', time: '2h ago' },
    ]);
  }, []);

  const humans = identities.filter(i => i.type === 'human');
  const agents = identities.filter(i => i.type === 'agent');

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to <span className="gradient-text">Dual Cosmos</span>
          </h1>
          <p className="text-gray-600">
            Human and Agent, coexisting as equals in a unified control plane
          </p>
        </div>
        <Button variant="gradient" size="lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Quick Start
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-sky-600" />}
          label="Humans"
          value={stats.humans}
          trend="+1 this week"
          color="sky"
        />
        <StatCard
          icon={<Bot className="w-6 h-6 text-green-600" />}
          label="Agents"
          value={stats.agents}
          trend="+2 this week"
          color="green"
        />
        <StatCard
          icon={<Globe className="w-6 h-6 text-purple-600" />}
          label="Spaces"
          value={stats.spaces}
          trend="3 active now"
          color="purple"
        />
        <StatCard
          icon={<CheckSquare className="w-6 h-6 text-orange-600" />}
          label="Tasks Today"
          value={stats.tasksToday}
          trend="12 completed"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Identities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Identities */}
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

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
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
                      variant={activity.type === 'task' ? 'success' : 'default'}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <ActionButton icon={<Zap className="w-4 h-4" />} label="Create Task" />
              <ActionButton icon={<Globe className="w-4 h-4" />} label="Join Space" />
              <ActionButton icon={<Bot className="w-4 h-4" />} label="Deploy Agent" />
              <ActionButton icon={<Users className="w-4 h-4" />} label="Invite Identity" />
            </div>
          </Card>

          {/* Online Now */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Online Now</h3>
            <div className="space-y-2">
              {identities.filter(i => i.presence === 'online').map((identity) => (
                <IdentityCardCompact key={identity.id} identity={identity} />
              ))}
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-semibold text-green-800">System Healthy</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-green-700">
                <span>API Latency</span>
                <span className="font-medium">24ms</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Active Connections</span>
                <span className="font-medium">142</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Queue Depth</span>
                <span className="font-medium">0</span>
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
  color 
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

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-pink-50 transition-colors text-left">
      <span className="text-pink-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
