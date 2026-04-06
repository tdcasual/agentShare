/**
 * Member Manager - 空间成员管理组件
 */

'use client';

import { useState } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { Input } from '@/shared/ui-primitives/input';
import { Badge } from '@/shared/ui-primitives/badge';
import type { SpaceMember } from '../types';
import { Users, Plus, User, Bot } from 'lucide-react';

interface MemberManagerProps {
  members: SpaceMember[];
  onAddMember: (input: {
    memberType: 'agent' | 'human';
    memberId: string;
    role: string;
  }) => Promise<void>;
  isAdding: boolean;
  canManage?: boolean;
}

const ROLE_OPTIONS = [
  { value: 'viewer', label: '观察者' },
  { value: 'operator', label: '操作员' },
  { value: 'admin', label: '管理员' },
];

export function MemberManager({
  members,
  onAddMember,
  isAdding,
  canManage = true,
}: MemberManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [memberType, setMemberType] = useState<'agent' | 'human'>('agent');
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('viewer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddMember({ memberType, memberId, role });
    setMemberId('');
    setShowAddForm(false);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <Card variant="default" className="p-4">
      {/* 头部 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-pink-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            {canManage ? '成员管理' : '成员'}
          </h3>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            添加成员
          </Button>
        ) : null}
      </div>

      {/* 添加成员表单 */}
      {canManage && showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-xl bg-pink-50/50 p-4 dark:bg-[#1A1A2E]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                成员类型
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberType('human')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    memberType === 'human'
                      ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                      : 'bg-white text-gray-600 dark:bg-[#252540]'
                  }`}
                >
                  <User className="h-4 w-4" />
                  人类
                </button>
                <button
                  type="button"
                  onClick={() => setMemberType('agent')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    memberType === 'agent'
                      ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                      : 'bg-white text-gray-600 dark:bg-[#252540]'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  智能体
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                角色
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm dark:border-[#3D3D5C] dark:bg-[#252540]"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              成员ID
            </label>
            <Input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder={`输入${memberType === 'human' ? '用户' : '智能体'}ID`}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              disabled={isAdding}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="kawaii"
              size="sm"
              disabled={isAdding || !memberId.trim()}
              className="flex-1"
            >
              {isAdding ? '添加中...' : '添加'}
            </Button>
          </div>
        </form>
      )}

      {/* 成员列表 */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">暂无成员</p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-[#252540]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/20">
                  {member.member_type === 'human' ? (
                    <User className="h-4 w-4 text-pink-500" />
                  ) : (
                    <Bot className="h-4 w-4 text-pink-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {member.member_id.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.member_type === 'human' ? '人类' : '智能体'} ·{' '}
                    {formatDate(member.created_at)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{member.role}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
