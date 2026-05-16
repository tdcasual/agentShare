'use client';

import { FormEvent, useState } from 'react';

import { Input } from '@/shared/ui-primitives/input';
import { Button } from '@/shared/ui-primitives/button';
import { MutationAlert } from '@/shared/mutations/mutation-alert';
import {
  AGENT_MODEL_OPTIONS,
  AUTH_METHOD_OPTIONS,
  DEFAULT_AUTH_METHOD,
  SANDBOX_MODE_OPTIONS,
  TASK_TYPE_OPTIONS,
  THINKING_LEVEL_OPTIONS,
} from '@/lib/option-catalogs';
import type { OpenClawAgent } from '@/domains/identity';
import type { OpenClawAgentCreateInput, OpenClawAgentUpdateInput } from '@/domains/identity/api';
import { useI18n } from '@/components/i18n-provider';

export interface AgentCapabilityOption {
  id: string;
  name: string;
}

export interface AgentModalProps {
  onClose: () => void;
  agent?: OpenClawAgent | null;
  availableCapabilities: AgentCapabilityOption[];
  onSubmit: (payload: OpenClawAgentCreateInput | OpenClawAgentUpdateInput) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_FORM: OpenClawAgentCreateInput = {
  name: '',
  workspace_root: '',
  agent_dir: '',
  model: '',
  thinking_level: 'balanced',
  sandbox_mode: 'workspace-write',
  risk_tier: 'low',
  auth_method: DEFAULT_AUTH_METHOD,
  allowed_capability_ids: [],
  allowed_task_types: [],
};

const selectClassName =
  'w-full rounded-2xl border-2 border-[var(--kw-border)] bg-[var(--kw-surface)] px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-2 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]';

export function AgentModal({
  onClose,
  agent,
  availableCapabilities,
  onSubmit,
  isSubmitting,
}: AgentModalProps) {
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
      setError(
        submitError instanceof Error ? submitError.message : t('identities.agentModal.submitFailed')
      );
    }
  }

  function updateField<K extends keyof OpenClawAgentCreateInput>(
    field: K,
    value: OpenClawAgentCreateInput[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleListValue(field: 'allowed_capability_ids' | 'allowed_task_types', value: string) {
    setForm((current) => {
      const currentValues = current[field] ?? [];
      return {
        ...current,
        [field]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
          {isEdit ? t('identities.agentModal.editTitle') : t('identities.agentModal.createTitle')}
        </h2>
        <p className="text-sm text-[var(--kw-text-muted)]">
          {isEdit ? t('identities.agentModal.editDesc') : t('identities.agentModal.createDesc')}
        </p>
      </div>
      <Input
        label={t('identities.agentModal.name')}
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        placeholder={t('identities.agentModal.namePlaceholder')}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CatalogSelect
          id="agent-model"
          label={t('identities.labels.model')}
          value={form.model ?? ''}
          onChange={(value) => updateField('model', value)}
          options={AGENT_MODEL_OPTIONS}
          t={t}
        />
        <div>
          <label
            htmlFor="agent-thinking-level"
            className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]"
          >
            {t('identities.labels.thinkingLevel')}
          </label>
          <select
            id="agent-thinking-level"
            className={selectClassName}
            value={form.thinking_level}
            onChange={(e) => updateField('thinking_level', e.target.value)}
          >
            {THINKING_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="agent-sandbox-mode"
            className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]"
          >
            {t('identities.labels.sandboxMode')}
          </label>
          <select
            id="agent-sandbox-mode"
            className={selectClassName}
            value={form.sandbox_mode}
            onChange={(e) => updateField('sandbox_mode', e.target.value)}
          >
            {SANDBOX_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="agent-risk-tier"
            className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]"
          >
            {t('identities.agentModal.riskTier')}
          </label>
          <select
            id="agent-risk-tier"
            className={selectClassName}
            value={form.risk_tier}
            onChange={(e) => updateField('risk_tier', e.target.value)}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="agent-auth-method"
            className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]"
          >
            {t('identities.agentModal.authMethod')}
          </label>
          <select
            id="agent-auth-method"
            className={selectClassName}
            value={form.auth_method}
            onChange={(e) => updateField('auth_method', e.target.value)}
          >
            {AUTH_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2 rounded-2xl border border-[var(--kw-border)] p-3 sm:p-4 dark:border-[var(--kw-dark-border)]">
        <legend className="px-1 text-sm font-medium text-[var(--kw-text)]">
          {t('identities.labels.allowedCapabilityIds')}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableCapabilities.map((capability) => (
            <label
              key={capability.id}
              className="bg-[var(--kw-surface)]/70 flex items-start gap-3 rounded-xl border border-[var(--kw-border)] p-3 text-sm dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={(form.allowed_capability_ids ?? []).includes(capability.id)}
                onChange={() => toggleListValue('allowed_capability_ids', capability.id)}
              />
              <span>
                <span className="block font-medium text-[var(--kw-text)]">{capability.name}</span>
                <span className="block text-xs text-[var(--kw-text-muted)]">{capability.id}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-2xl border border-[var(--kw-border)] p-3 sm:p-4 dark:border-[var(--kw-dark-border)]">
        <legend className="px-1 text-sm font-medium text-[var(--kw-text)]">
          {t('identities.labels.allowedTaskTypes')}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TASK_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="bg-[var(--kw-surface)]/70 flex items-center gap-3 rounded-xl border border-[var(--kw-border)] p-3 text-sm dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={(form.allowed_task_types ?? []).includes(option.value)}
                onChange={() => toggleListValue('allowed_task_types', option.value)}
              />
              <span className="font-medium text-[var(--kw-text)]">{t(option.labelKey)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <MutationAlert error={error} success={null} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}

function CatalogSelect({
  id,
  label,
  value,
  options,
  t,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; labelKey: string }[];
  t: (key: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
        {label}
      </label>
      <select
        id={id}
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
