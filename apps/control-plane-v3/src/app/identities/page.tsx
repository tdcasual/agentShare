'use client';

import { useEffect, useState } from 'react';
import { Layout } from '../../interfaces/human/layout';
import { getRuntime } from '../../core/runtime';
import { IdentityRegistryServiceId } from '../../domains/identity/services/identity-registry';
import { IdentityCard } from '../../domains/identity/components/identity-card';
import type { Identity } from '../../shared/types';
import { Input } from '../../shared/ui-primitives/input';
import { Button } from '../../shared/ui-primitives/button';
import { Badge } from '../../shared/ui-primitives/badge';
import { Modal } from '../../shared/ui-primitives/modal';
import { Card } from '../../shared/ui-primitives/card';
import { Search, Plus, Filter, Grid, List, Users, Bot } from 'lucide-react';

export default function IdentitiesPage() {
  return (
    <Layout>
      <IdentitiesContent />
    </Layout>
  );
}

function IdentitiesContent() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [filteredIdentities, setFilteredIdentities] = useState<Identity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'human' | 'agent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const runtime = getRuntime();
    const registry = runtime.di.resolve(IdentityRegistryServiceId);
    const allIdentities = registry.getAll();
    setIdentities(allIdentities);
    setFilteredIdentities(allIdentities);
  }, []);

  useEffect(() => {
    let filtered = identities;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        i.profile.name.toLowerCase().includes(query) ||
        i.profile.bio?.toLowerCase().includes(query) ||
        i.profile.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(i => i.type === typeFilter);
    }

    setFilteredIdentities(filtered);
  }, [searchQuery, typeFilter, identities]);

  const humans = identities.filter(i => i.type === 'human');
  const agents = identities.filter(i => i.type === 'agent');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Identity Universe</h1>
          <p className="text-gray-600 mt-1">
            Browse and manage all identities in the system
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Identity
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{humans.length}</p>
            <p className="text-sm text-gray-500">Human Users</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Bot className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{agents.length}</p>
            <p className="text-sm text-gray-500">AI Agents</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{identities.length}</p>
            <p className="text-sm text-gray-500">Total Identities</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search identities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white rounded-full p-1 border border-pink-200">
            <FilterButton
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
              label="All"
              count={identities.length}
            />
            <FilterButton
              active={typeFilter === 'human'}
              onClick={() => setTypeFilter('human')}
              label="Humans"
              count={humans.length}
            />
            <FilterButton
              active={typeFilter === 'agent'}
              onClick={() => setTypeFilter('agent')}
              label="Agents"
              count={agents.length}
            />
          </div>
          <div className="flex bg-white rounded-full p-1 border border-pink-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'grid' ? 'bg-pink-100 text-pink-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'list' ? 'bg-pink-100 text-pink-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Showing {filteredIdentities.length} of {identities.length} identities
        </p>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIdentities.map((identity, index) => (
              <div
                key={identity.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <IdentityCard identity={identity} />
              </div>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-pink-100">
              {filteredIdentities.map((identity) => (
                <div
                  key={identity.id}
                  className="p-4 flex items-center gap-4 hover:bg-pink-50/30 transition-colors"
                >
                  <img
                    src={identity.profile.avatar}
                    alt={identity.profile.name}
                    className={`w-12 h-12 rounded-full object-cover border-2 ${
                      identity.type === 'human' ? 'border-sky-300' : 'border-green-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{identity.profile.name}</h3>
                      <Badge variant={identity.type === 'human' ? 'human' : 'agent'}>
                        {identity.type === 'human' ? 'Human' : 'Agent'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{identity.profile.bio}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      identity.presence === 'online' ? 'bg-green-400' :
                      identity.presence === 'away' ? 'bg-yellow-400' :
                      identity.presence === 'busy' ? 'bg-red-400' :
                      'bg-gray-300'
                    )} />
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Identity"
        description="Choose the type of identity you want to create"
      >
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowCreateModal(false)}
            className="p-6 rounded-2xl border-2 border-sky-200 bg-sky-50/50 hover:bg-sky-100 transition-colors text-center"
          >
            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-sky-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Human</h3>
            <p className="text-sm text-gray-500">Create a human user account</p>
          </button>
          <button
            onClick={() => setShowCreateModal(false)}
            className="p-6 rounded-2xl border-2 border-green-200 bg-green-50/50 hover:bg-green-100 transition-colors text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Agent</h3>
            <p className="text-sm text-gray-500">Create an AI agent</p>
          </button>
        </div>
      </Modal>
    </div>
  );
}

function FilterButton({ 
  active, 
  onClick, 
  label, 
  count 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
        active
          ? 'bg-pink-500 text-white'
          : 'text-gray-600 hover:bg-pink-50'
      )}
    >
      {label} ({count})
    </button>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
