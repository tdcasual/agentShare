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
import { useI18n } from '@/components/i18n-provider';
import { translateSpaceMemberRole } from '@/lib/enum-labels';

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

export function MemberManager({
  members,
  onAddMember,
  isAdding,
  canManage = true,
}: MemberManagerProps) {
  const { locale, t } = useI18n();
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
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  const roleOptions = [
    { value: 'viewer', label: t('spaces.memberManager.roles.viewer') },
    { value: 'operator', label: t('spaces.memberManager.roles.operator') },
    { value: 'admin', label: t('spaces.memberManager.roles.admin') },
  ];

  return (
    <Card variant="default" className="p-4">
      {/* 头部 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--kw-primary-500)]" />
          <h3 className="font-semibold text-[var(--kw-text)]">
            {canManage
              ? t('spaces.memberManager.manageTitle')
              : t('spaces.memberManager.readOnlyTitle')}
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
            {t('spaces.memberManager.addMember')}
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
                {t('spaces.memberManager.memberType')}
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
                  {t('spaces.memberTypes.human')}
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
                  {t('spaces.memberTypes.agent')}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor={roleId}
                className="mb-1 block text-xs font-medium text-[var(--kw-text-muted)]"
              >
                {t('spaces.memberManager.roleLabel')}
              </label>
              <select
                id={roleId}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--kw-primary-200)] bg-white px-3 py-2 text-sm dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              htmlFor={memberIdInputId}
              className="mb-1 block text-xs font-medium text-[var(--kw-text-muted)]"
            >
              {t('spaces.memberManager.memberIdLabel')}
            </label>
            <Input
              id={memberIdInputId}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder={
                memberType === 'human'
                  ? t('spaces.memberManager.memberIdPlaceholderHuman')
                  : t('spaces.memberManager.memberIdPlaceholderAgent')
              }
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="kawaii"
              size="sm"
              disabled={isAdding || !memberId.trim()}
              className="flex-1"
            >
              {isAdding ? t('spaces.memberManager.adding') : t('spaces.memberManager.submit')}
            </Button>
          </div>
        </form>
      )}

      {/* 成员列表 */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--kw-text-muted)]">
            {t('spaces.memberManager.empty')}
          </p>
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
                    {member.member_type === 'human'
                      ? t('spaces.memberTypes.human')
                      : t('spaces.memberTypes.agent')}{' '}
                    · {formatDate(member.created_at)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{translateSpaceMemberRole(t, member.role)}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
