'use client';

import { useState } from 'react';
import { Layout } from '../../interfaces/human/layout';
import { Card } from '../../shared/ui-primitives/card';
import { Button } from '../../shared/ui-primitives/button';
import { Badge } from '../../shared/ui-primitives/badge';
import { Input } from '../../shared/ui-primitives/input';
import { Modal } from '../../shared/ui-primitives/modal';
import { 
  Search, Plus, Filter, Key, FileText, Lock, 
  Zap, Globe, Book, MessageSquare, Cpu, MoreHorizontal,
  ArrowRight
} from 'lucide-react';

export default function AssetsPage() {
  return (
    <Layout>
      <AssetsContent />
    </Layout>
  );
}

const assetTypes = [
  { id: 'api_key', name: 'API Key', icon: Key, color: 'blue' },
  { id: 'secret', name: 'Secret', icon: Lock, color: 'red' },
  { id: 'task', name: 'Task', icon: Zap, color: 'orange' },
  { id: 'capability', name: 'Capability', icon: Cpu, color: 'purple' },
  { id: 'space', name: 'Space', icon: Globe, color: 'green' },
  { id: 'document', name: 'Document', icon: FileText, color: 'gray' },
  { id: 'playbook', name: 'Playbook', icon: Book, color: 'pink' },
  { id: 'prompt', name: 'Prompt', icon: MessageSquare, color: 'indigo' },
];

const mockAssets = [
  { id: 1, name: 'Production API Key', type: 'api_key', owner: 'Alice', ownerType: 'human', visibility: 'private', updatedAt: '2h ago' },
  { id: 2, name: 'Database Credentials', type: 'secret', owner: 'DeployBot', ownerType: 'agent', visibility: 'restricted', updatedAt: '5h ago' },
  { id: 3, name: 'Deploy to Production', type: 'task', owner: 'Alice', ownerType: 'human', visibility: 'public', updatedAt: '1d ago' },
  { id: 4, name: 'OpenAI Integration', type: 'capability', owner: 'DataAnalyzer', ownerType: 'agent', visibility: 'shared', updatedAt: '2d ago' },
  { id: 5, name: 'Team Standup', type: 'space', owner: 'Alice', ownerType: 'human', visibility: 'public', updatedAt: '3d ago' },
  { id: 6, name: 'Deployment Guide', type: 'document', owner: 'DeployBot', ownerType: 'agent', visibility: 'public', updatedAt: '1w ago' },
];

function AssetsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const filteredAssets = mockAssets.filter(asset => {
    if (selectedType && asset.type !== selectedType) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Assets</h1>
          <p className="text-gray-600 mt-1">
            Manage tokens, tasks, secrets, and other shared resources
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Asset
        </Button>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            !selectedType
              ? 'bg-pink-500 text-white'
              : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-200'
          )}
        >
          All Types
        </button>
        {assetTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
                selectedType === type.id
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-pink-50 border border-pink-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {type.name}
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button variant="secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset, index) => {
          const typeInfo = assetTypes.find(t => t.id === asset.type);
          const Icon = typeInfo?.icon || FileText;
          
          return (
            <Card
              key={asset.id}
              hover
              className="p-5 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  `bg-${typeInfo?.color || 'gray'}-100`
                )}>
                  <Icon className={cn('w-6 h-6', `text-${typeInfo?.color || 'gray'}-600`)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{asset.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{asset.type.replace('_', ' ')}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge 
                      variant={asset.visibility === 'public' ? 'success' : 
                               asset.visibility === 'private' ? 'error' : 'warning'}
                      className="text-xs"
                    >
                      {asset.visibility}
                    </Badge>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{asset.updatedAt}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-pink-100">
                <img
                  src={`https://api.dicebear.com/7.x/${asset.ownerType === 'human' ? 'avataaars' : 'bottts'}/svg?seed=${asset.owner}`}
                  alt={asset.owner}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-gray-600">{asset.owner}</span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  asset.ownerType === 'human' ? 'bg-sky-100 text-sky-700' : 'bg-green-100 text-green-700'
                )}>
                  {asset.ownerType}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Asset"
        description="Choose the type of asset you want to create"
        size="lg"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {assetTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setShowCreateModal(false)}
                className="p-6 rounded-2xl border-2 border-pink-100 hover:border-pink-300 hover:bg-pink-50/50 transition-all text-center group"
              >
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors',
                  `bg-${type.color}-100 group-hover:bg-${type.color}-200`
                )}>
                  <Icon className={cn('w-7 h-7', `text-${type.color}-600`)} />
                </div>
                <h3 className="font-medium text-gray-800">{type.name}</h3>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Modal
          isOpen={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
          title={selectedAsset.name}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {(() => {
                const typeInfo = assetTypes.find(t => t.id === selectedAsset.type);
                const Icon = typeInfo?.icon || FileText;
                return (
                  <div className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center',
                    `bg-${typeInfo?.color || 'gray'}-100`
                  )}>
                    <Icon className={cn('w-8 h-8', `text-${typeInfo?.color || 'gray'}-600`)} />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{selectedAsset.name}</h3>
                <p className="text-gray-500 capitalize">{selectedAsset.type.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Owner</p>
                <div className="flex items-center gap-2">
                  <img
                    src={`https://api.dicebear.com/7.x/${selectedAsset.ownerType === 'human' ? 'avataaars' : 'bottts'}/svg?seed=${selectedAsset.owner}`}
                    alt={selectedAsset.owner}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">{selectedAsset.owner}</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Visibility</p>
                <Badge 
                  variant={selectedAsset.visibility === 'public' ? 'success' : 
                           selectedAsset.visibility === 'private' ? 'error' : 'warning'}
                >
                  {selectedAsset.visibility}
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button className="flex-1">Edit</Button>
              <Button variant="secondary" className="flex-1">Share</Button>
              <Button variant="ghost">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
