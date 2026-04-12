/**
 * Member Manager - 空间成员管理组件
 */

'use client';

import { useId, useState } from 'react';
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
  const idPrefix = useId();
  const memberIdInputId = `${idPrefix}-memberId`;
  const roleId = `${idPrefix}-role`;

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
          <Users className="h-5 w-5 text-[var(--kw-primary-500)]" />
          <h3 className="font-semibold text-[var(--kw-text)]">{canManage ? '成员管理' : '成员'}</h3>
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
          className="bg-[var(--kw-primary-50)]/50 mb-4 space-y-3 rounded-xl p-4 dark:bg-[var(--kw-dark-bg)]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--kw-text-muted)]">
                成员类型
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberType('human')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    memberType === 'human'
                      ? 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)]'
                      : 'bg-white text-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-surface)]'
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
                      ? 'bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-pink-surface)] dark:text-[var(--kw-dark-primary)]'
                      : 'bg-white text-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-surface)]'
                  }`}
                >
                  <Bot className="h-4 w-4" />
                  智能体
                </button>
              </div>
            </div>
            <div>
              <label htmlFor={roleId} className="mb-1 block text-xs font-medium text-[var(--kw-text-muted)]">
                角色
              </label>
              <select
                id={roleId}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--kw-primary-200)] bg-white px-3 py-2 text-sm dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
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
            <label htmlFor={memberIdInputId} className="mb-1 block text-xs font-medium text-[var(--kw-text-muted)]">
              成员ID
            </label>
            <Input
              id={memberIdInputId}
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
          <p className="py-4 text-center text-sm text-[var(--kw-text-muted)]">暂无成员</p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl bg-[var(--kw-surface-alt)] p-3 dark:bg-[var(--kw-dark-surface)]"
            >
              <div className="flex items-center gap-3">
                <div className="dark:bg-[var(--kw-dark-pink-surface)]/20 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kw-primary-100)]">
                  {member.member_type === 'human' ? (
                    <User className="h-4 w-4 text-[var(--kw-primary-500)]" />
                  ) : (
                    <Bot className="h-4 w-4 text-[var(--kw-primary-500)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--kw-text)]">
                    {member.member_id.slice(-8)}
                  </p>
                  <p className="text-xs text-[var(--kw-text-muted)]">
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
