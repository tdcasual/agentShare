'use client';

import { useState } from 'react';
import { Layout } from '../../interfaces/human/layout';
import { Card } from '../../shared/ui-primitives/card';
import { Button } from '../../shared/ui-primitives/button';
import { Badge } from '../../shared/ui-primitives/badge';
import { Input } from '../../shared/ui-primitives/input';
import { Modal } from '../../shared/ui-primitives/modal';
import { Avatar, AvatarGroup } from '../../shared/ui-primitives/avatar';
import { useI18n } from '@/components/i18n-provider';
import { 
  Search, Plus, Globe, Lock, Users, MessageSquare, 
  Radio, Hash, Video, Mic
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function SpacesPage() {
  return (
    <Layout>
      <SpacesContent />
    </Layout>
  );
}

const mockSpaces = [
  { 
    id: 1, 
    name: 'Project Alpha', 
    type: 'project', 
    visibility: 'public',
    participants: [
      { id: '1', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', type: 'human' },
      { id: '2', name: 'DeployBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot', type: 'agent' },
      { id: '3', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', type: 'human' },
    ],
    activity: '2m ago',
    unread: 5,
  },
  { 
    id: 2, 
    name: 'AI-Human Pairing', 
    type: 'ai_human_pair', 
    visibility: 'private',
    participants: [
      { id: '1', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', type: 'human' },
      { id: '4', name: 'DataAnalyzer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DataAnalyzer', type: 'agent' },
    ],
    activity: 'active now',
    unread: 0,
  },
  { 
    id: 3, 
    name: 'DevOps Swarm', 
    type: 'swarm', 
    visibility: 'restricted',
    participants: [
      { id: '2', name: 'DeployBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot', type: 'agent' },
      { id: '5', name: 'MonitorBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MonitorBot', type: 'agent' },
      { id: '6', name: 'LogBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LogBot', type: 'agent' },
    ],
    activity: '5m ago',
    unread: 12,
  },
  { 
    id: 4, 
    name: 'General', 
    type: 'channel', 
    visibility: 'public',
    participants: [
      { id: '1', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', type: 'human' },
      { id: '2', name: 'DeployBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot', type: 'agent' },
      { id: '3', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', type: 'human' },
      { id: '4', name: 'DataAnalyzer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DataAnalyzer', type: 'agent' },
    ],
    activity: '1h ago',
    unread: 0,
  },
];

function SpacesContent() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSpace, setActiveSpace] = useState<any>(mockSpaces[0]);

  const filteredSpaces = mockSpaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {/* Spaces List */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('spaces.title') || 'Spaces'}</h1>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} aria-label={t('spaces.createSpace') || 'Create Space'}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Input
          placeholder={t('spaces.searchPlaceholder') || 'Search spaces...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="mb-4"
        />

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredSpaces.map((space) => (
            <button
              key={space.id}
              onClick={() => setActiveSpace(space)}
              className={cn(
                'w-full text-left p-3 rounded-2xl transition-all',
                activeSpace?.id === space.id
                  ? 'bg-pink-100 border border-pink-200'
                  : 'hover:bg-pink-50/50 border border-transparent'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  space.type === 'ai_human_pair' ? 'bg-gradient-to-br from-sky-100 to-green-100' :
                  space.type === 'swarm' ? 'bg-green-100' :
                  'bg-pink-100'
                )}>
                  {space.type === 'ai_human_pair' ? (
                    <span className="text-lg">👤🤖</span>
                  ) : space.type === 'swarm' ? (
                    <span className="text-lg">🐝</span>
                  ) : (
                    <Hash className="w-5 h-5 text-pink-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 dark:text-[#E8E8EC] truncate">{space.name}</h3>
                    {space.visibility === 'private' && <Lock className="w-3 h-3 text-gray-400 dark:text-[#9CA3AF]" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{space.activity}</p>
                </div>
                {space.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                    {space.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Space */}
      {activeSpace ? (
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Space Header */}
          <div className="p-4 border-b border-pink-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                activeSpace.type === 'ai_human_pair' ? 'bg-gradient-to-br from-sky-100 to-green-100' :
                activeSpace.type === 'swarm' ? 'bg-green-100' :
                'bg-pink-100'
              )}>
                {activeSpace.type === 'ai_human_pair' ? (
                  <span className="text-lg">👤🤖</span>
                ) : activeSpace.type === 'swarm' ? (
                  <span className="text-lg">🐝</span>
                ) : (
                  <Hash className="w-5 h-5 text-pink-600" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">{activeSpace.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  <span className="capitalize">{t(`spaces.type.${activeSpace.type}`) || activeSpace.type.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>{activeSpace.participants.length} {t('spaces.members') || 'members'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AvatarGroup>
                {activeSpace.participants.slice(0, 3).map((p: any) => (
                  <Avatar key={p.id} src={p.avatar} size="xs" type={p.type} />
                ))}
              </AvatarGroup>
              <Button variant="secondary" size="sm">
                <Users className="w-4 h-4 mr-1" />
                {t('spaces.invite') || 'Invite'}
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center text-sm text-gray-400 dark:text-[#9CA3AF]">
              {t('spaces.today') || 'Today'}
            </div>

            {/* Welcome Message */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs">
                🤖
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">{t('spaces.system') || 'System'}</span>
                  <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">10:00 AM</span>
                </div>
                <p className="text-gray-600 dark:text-[#9CA3AF] mt-1">
                  {`${t('spaces.welcomeTo') || 'Welcome to'} ${activeSpace.name}! ${t('spaces.thisIsA') || 'This is a'} ${t(`spaces.type.${activeSpace.type}`) || activeSpace.type.replace('_', ' ')} ${t('spaces.space') || 'space'}.`}
                </p>
              </div>
            </div>

            {/* Human Message */}
            <div className="flex gap-3">
              <Avatar 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" 
                size="sm" 
                type="human"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">Alice</span>
                  <Badge variant="human" className="text-[10px] px-1.5 py-0">{t('identities.type.human') || 'Human'}</Badge>
                  <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">10:05 AM</span>
                </div>
                <p className="text-gray-700 dark:text-[#E8E8EC] mt-1">
                  {t('spaces.demoMessages.human1') || "Hey everyone! Let's discuss the deployment strategy for today."}
                </p>
              </div>
            </div>

            {/* Agent Message */}
            <div className="flex gap-3">
              <Avatar 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot" 
                size="sm" 
                type="agent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">DeployBot</span>
                  <Badge variant="agent" className="text-[10px] px-1.5 py-0">{t('identities.type.agent') || 'Agent'}</Badge>
                  <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">10:06 AM</span>
                </div>
                <div className="bg-green-50 rounded-2xl rounded-tl-none p-3 mt-1">
                  <p className="text-gray-700 dark:text-[#E8E8EC]">
                    {t('spaces.demoMessages.agent1') || "I've analyzed the current environment. Here are my recommendations:"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                    <li>• {t('spaces.demoMessages.recommendation1') || 'Use blue-green deployment for zero downtime'}</li>
                    <li>• {t('spaces.demoMessages.recommendation2') || 'Run smoke tests before switching traffic'}</li>
                    <li>• {t('spaces.demoMessages.recommendation3') || 'Monitor error rates for 5 minutes post-deploy'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Human Response */}
            <div className="flex gap-3">
              <Avatar 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" 
                size="sm" 
                type="human"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">Alice</span>
                  <Badge variant="human" className="text-[10px] px-1.5 py-0">{t('identities.type.human') || 'Human'}</Badge>
                  <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">10:08 AM</span>
                </div>
                <p className="text-gray-700 dark:text-[#E8E8EC] mt-1">
                  {t('spaces.demoMessages.human2') || "Sounds good @DeployBot! Let's proceed with the blue-green deployment. Can you prepare the staging environment?"}
                </p>
              </div>
            </div>

            {/* Agent Action */}
            <div className="flex gap-3">
              <Avatar 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot" 
                size="sm" 
                type="agent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-[#E8E8EC]">DeployBot</span>
                  <Badge variant="agent" className="text-[10px] px-1.5 py-0">{t('identities.type.agent') || 'Agent'}</Badge>
                  <span className="text-xs text-gray-400 dark:text-[#9CA3AF]">10:08 AM</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="animate-pulse flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {t('spaces.demoMessages.preparing') || 'Preparing staging environment...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-pink-100">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-pink-50 text-gray-400 dark:text-[#9CA3AF] hover:text-pink-500 transition-colors" aria-label={t('spaces.addAttachment') || 'Add attachment'}>
                <Plus className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t('spaces.messagePlaceholder') || 'Message @DeployBot or the group...'}
                  className="w-full px-4 py-3 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-pink-200 outline-none"
                  aria-label={t('spaces.messageInput') || 'Message input'}
                />
              </div>
              <button className="p-2 rounded-full hover:bg-pink-50 text-gray-400 dark:text-[#9CA3AF] hover:text-pink-500 transition-colors" aria-label={t('spaces.sendMessage') || 'Send message'}>
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-10 h-10 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC] mb-2">{t('spaces.selectSpace') || 'Select a Space'}</h3>
            <p className="text-gray-500 dark:text-[#9CA3AF]">{t('spaces.selectSpaceDescription') || 'Choose a space from the list to start collaborating'}</p>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('spaces.createSpace') || 'Create Space'}
        description={t('spaces.createSpaceDescription') || 'Create a new collaboration space'}
      >
        <div className="space-y-4">
          <Input label={t('spaces.spaceName') || 'Space Name'} placeholder={t('spaces.spaceNamePlaceholder') || 'e.g., Project Alpha'} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC] mb-2">{t('spaces.spaceType') || 'Space Type'}</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="p-4 rounded-2xl border-2 border-pink-200 bg-pink-50/50 hover:bg-pink-100 transition-colors text-left">
                <Hash className="w-6 h-6 text-pink-500 mb-2" />
                <h4 className="font-medium">{t('spaces.type.channel') || 'Channel'}</h4>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{t('spaces.type.channelDesc') || 'Open discussion'}</p>
              </button>
              <button type="button" className="p-4 rounded-2xl border-2 border-purple-200 bg-purple-50/50 hover:bg-purple-100 transition-colors text-left">
                <Globe className="w-6 h-6 text-purple-500 mb-2" />
                <h4 className="font-medium">{t('spaces.type.project') || 'Project'}</h4>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{t('spaces.type.projectDesc') || 'Task-focused'}</p>
              </button>
              <button type="button" className="p-4 rounded-2xl border-2 border-sky-200 bg-sky-50/50 hover:bg-sky-100 transition-colors text-left">
                <Users className="w-6 h-6 text-sky-500 mb-2" />
                <h4 className="font-medium">{t('spaces.type.ai_human_pair') || 'AI-Human Pair'}</h4>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{t('spaces.type.aiHumanPairDesc') || 'Close collaboration'}</p>
              </button>
              <button type="button" className="p-4 rounded-2xl border-2 border-green-200 bg-green-50/50 hover:bg-green-100 transition-colors text-left">
                <Radio className="w-6 h-6 text-green-500 mb-2" />
                <h4 className="font-medium">{t('spaces.type.swarm') || 'Swarm'}</h4>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{t('spaces.type.swarmDesc') || 'Multi-agent'}</p>
              </button>
            </div>
          </div>
          <Button className="w-full">{t('spaces.createSpace') || 'Create Space'}</Button>
        </div>
      </Modal>
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
