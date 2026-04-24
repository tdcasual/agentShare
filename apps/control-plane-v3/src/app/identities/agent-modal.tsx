'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Modal } from '@/shared/ui-primitives/modal';
import { Input } from '@/shared/ui-primitives/input';
import { Button } from '@/shared/ui-primitives/button';
import type { OpenClawAgent } from '@/domains/identity';
import type { OpenClawAgentCreateInput, OpenClawAgentUpdateInput } from '@/domains/identity/api';
import { useI18n } from '@/components/i18n-provider';

export interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: OpenClawAgent | null;
  onSubmit: (payload: OpenClawAgentCreateInput | OpenClawAgentUpdateInput) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_FORM: OpenClawAgentCreateInput = {
  name: '',
  workspace_root: '',
  agent_dir: '',
  model: '',
  thinking_level: 'standard',
  sandbox_mode: 'isolated',
  risk_tier: 'low',
  auth_method: 'internal',
  allowed_capability_ids: [],
  allowed_task_types: [],
};

export function AgentModal({ isOpen, onClose, agent, onSubmit, isSubmitting }: AgentModalProps) {
  const { t } = useI18n();
  const isEdit = Boolean(agent);
  const [form, setForm] = useState<OpenClawAgentCreateInput>(() =>
    agent
      ? {
          name: agent.name,
          workspace_root: agent.workspace_root,
          agent_dir: agent.agent_dir,
          model: agent.model ?? '',
          thinking_level: agent.thinking_level,
          sandbox_mode: agent.sandbox_mode,
          risk_tier: agent.risk_tier,
          auth_method: agent.auth_method,
          allowed_capability_ids: agent.allowed_capability_ids,
          allowed_task_types: agent.allowed_task_types,
        }
      : { ...DEFAULT_FORM }
  );
  const [error, setError] = useState<string | null>(null);

  const capabilityIdsText = useMemo(
    () => form.allowed_capability_ids?.join(', ') ?? '',
    [form.allowed_capability_ids]
  );
  const taskTypesText = useMemo(
    () => form.allowed_task_types?.join(', ') ?? '',
    [form.allowed_task_types]
  );

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError(t('identities.agentModal.nameRequired'));
      return;
    }
    if (!form.workspace_root.trim()) {
      setError(t('identities.agentModal.workspaceRootRequired'));
      return;
    }
    if (!form.agent_dir.trim()) {
      setError(t('identities.agentModal.agentDirRequired'));
      return;
    }

    const payload: OpenClawAgentCreateInput = {
      ...form,
      model: form.model || null,
    };

    try {
      await onSubmit(payload);
      if (!isEdit) {
        setForm({ ...DEFAULT_FORM });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('identities.agentModal.submitFailed'));
    }
  }

  function updateField<K extends keyof OpenClawAgentCreateInput>(field: K, value: OpenClawAgentCreateInput[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? t('identities.agentModal.editTitle') : t('identities.agentModal.createTitle')}
      description={isEdit ? t('identities.agentModal.editDesc') : t('identities.agentModal.createDesc')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('identities.agentModal.name')}
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={t('identities.agentModal.namePlaceholder')}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('identities.labels.workspaceRoot')}
            value={form.workspace_root}
            onChange={(e) => updateField('workspace_root', e.target.value)}
            placeholder="/workspace/agents/example"
            required
          />
          <Input
            label={t('identities.labels.agentDirectory')}
            value={form.agent_dir}
            onChange={(e) => updateField('agent_dir', e.target.value)}
            placeholder="/app/agent"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('identities.labels.model')}
            value={form.model ?? ''}
            onChange={(e) => updateField('model', e.target.value)}
            placeholder="gpt-4o"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
              {t('identities.labels.thinkingLevel')}
            </label>
            <select
              className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
              value={form.thinking_level}
              onChange={(e) => updateField('thinking_level', e.target.value)}
            >
              <option value="minimal">minimal</option>
              <option value="standard">standard</option>
              <option value="deep">deep</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
              {t('identities.labels.sandboxMode')}
            </label>
            <select
              className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
              value={form.sandbox_mode}
              onChange={(e) => updateField('sandbox_mode', e.target.value)}
            >
              <option value="isolated">isolated</option>
              <option value="shared">shared</option>
              <option value="host">host</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
              {t('identities.agentModal.riskTier')}
            </label>
            <select
              className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
              value={form.risk_tier}
              onChange={(e) => updateField('risk_tier', e.target.value)}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
              {t('identities.agentModal.authMethod')}
            </label>
            <select
              className="w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
              value={form.auth_method}
              onChange={(e) => updateField('auth_method', e.target.value)}
            >
              <option value="internal">internal</option>
              <option value="token">token</option>
              <option value="mTLS">mTLS</option>
            </select>
          </div>
        </div>

        <Input
          label={t('identities.labels.allowedCapabilityIds')}
          value={capabilityIdsText}
          onChange={(e) =>
            updateField(
              'allowed_capability_ids',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="capability-1, capability-2"
          helper={t('identities.agentModal.commaSeparated')}
        />

        <Input
          label={t('identities.labels.allowedTaskTypes')}
          value={taskTypesText}
          onChange={(e) =>
            updateField(
              'allowed_task_types',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="analysis, deployment"
          helper={t('identities.agentModal.commaSeparated')}
        />

        {error ? (
          <div className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 p-3 text-sm text-[var(--kw-rose-text)]">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
