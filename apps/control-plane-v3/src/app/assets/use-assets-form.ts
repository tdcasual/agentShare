'use client';

import { useState, useCallback, FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { useI18n } from '@/components/i18n-provider';
import type { useCreateSecret, useCreateCapability } from '@/domains/governance';

type CreateSecretFn = ReturnType<typeof useCreateSecret>;
type CreateCapabilityFn = ReturnType<typeof useCreateCapability>;

export type AccessComposerMode = 'all_tokens' | 'specific_tokens' | 'specific_agents' | 'token_label';

export interface SecretFormState {
  display_name: string;
  kind: string;
  value: string;
  provider: string;
  environment: string;
  provider_scopes: string;
  resource_selector: string;
}

export interface CapabilityFormState {
  name: string;
  secret_id: string;
  risk_level: string;
  allowed_mode: string;
  lease_ttl_seconds: string;
  required_provider: string;
  required_provider_scopes: string;
  access_mode: AccessComposerMode;
  token_ids: string[];
  agent_ids: string[];
  label_key: string;
  label_values: string[];
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCapabilityAccessPolicy(form: CapabilityFormState) {
  if (form.access_mode === 'all_tokens') {
    return { mode: 'all_tokens' as const, selectors: [] };
  }
  if (form.access_mode === 'specific_tokens') {
    return {
      mode: 'selectors' as const,
      selectors: [{ kind: 'token' as const, ids: form.token_ids }],
    };
  }
  if (form.access_mode === 'specific_agents') {
    return {
      mode: 'selectors' as const,
      selectors: [{ kind: 'agent' as const, ids: form.agent_ids }],
    };
  }
  return {
    mode: 'selectors' as const,
    selectors: [
      { kind: 'token_label' as const, key: form.label_key, values: form.label_values },
    ],
  };
}

export function useAssetsForm({
  createSecret,
  createCapability,
  secrets,
  consumeUnauthorized,
  clearAllAuthErrors,
  onSecretCreated,
  onCapabilityCreated,
}: {
  createSecret: CreateSecretFn;
  createCapability: CreateCapabilityFn;
  secrets: { id: string; provider?: string | null; provider_scopes?: string[] }[];
  consumeUnauthorized: (error: unknown) => boolean;
  clearAllAuthErrors: () => void;
  onSecretCreated?: () => void;
  onCapabilityCreated?: () => void;
}) {
  const { t } = useI18n();

  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [submittingSecret, setSubmittingSecret] = useState(false);
  const [submittingCapability, setSubmittingCapability] = useState(false);
  const [secretForm, setSecretForm] = useState<SecretFormState>({
    display_name: '',
    kind: 'api_token',
    value: '',
    provider: 'openai',
    environment: '',
    provider_scopes: '',
    resource_selector: '',
  });
  const [capabilityForm, setCapabilityForm] = useState<CapabilityFormState>({
    name: '',
    secret_id: '',
    risk_level: 'medium',
    allowed_mode: 'proxy_or_lease',
    lease_ttl_seconds: '120',
    required_provider: '',
    required_provider_scopes: '',
    access_mode: 'all_tokens',
    token_ids: [],
    agent_ids: [],
    label_key: '',
    label_values: [],
  });
  const [error, setError] = useState<string | null>(null);

  const openSecretModal = useCallback(() => {
    setSecretForm({
      display_name: '',
      kind: 'api_token',
      value: '',
      provider: 'openai',
      environment: '',
      provider_scopes: '',
      resource_selector: '',
    });
    setError(null);
    setShowSecretModal(true);
  }, []);

  const closeSecretModal = useCallback(() => {
    setShowSecretModal(false);
  }, []);

  const openCapabilityModal = useCallback(() => {
    setCapabilityForm((current) => ({
      ...current,
      name: '',
      risk_level: 'medium',
      allowed_mode: 'proxy_or_lease',
      lease_ttl_seconds: '120',
      required_provider: '',
      required_provider_scopes: '',
      access_mode: 'all_tokens',
      token_ids: [],
      agent_ids: [],
      label_key: '',
      label_values: [],
    }));
    setError(null);
    setShowCapabilityModal(true);
  }, []);

  const closeCapabilityModal = useCallback(() => {
    setShowCapabilityModal(false);
  }, []);

  const handleCapabilitySecretChange = useCallback(
    (secretId: string) => {
      const secret = secrets.find((item) => item.id === secretId);
      setCapabilityForm((current) => ({
        ...current,
        secret_id: secretId,
        required_provider: secret?.provider ?? current.required_provider,
        required_provider_scopes:
          current.required_provider_scopes || (secret?.provider_scopes ?? []).join(', '),
      }));
    },
    [secrets]
  );

  const toggleCapabilityToken = useCallback((tokenId: string) => {
    setCapabilityForm((current) => ({
      ...current,
      token_ids: current.token_ids.includes(tokenId)
        ? current.token_ids.filter((item) => item !== tokenId)
        : [...current.token_ids, tokenId],
    }));
  }, []);

  const toggleCapabilityAgent = useCallback((agentId: string) => {
    setCapabilityForm((current) => ({
      ...current,
      agent_ids: current.agent_ids.includes(agentId)
        ? current.agent_ids.filter((item) => item !== agentId)
        : [...current.agent_ids, agentId],
    }));
  }, []);

  const toggleCapabilityLabelValue = useCallback((value: string) => {
    setCapabilityForm((current) => ({
      ...current,
      label_values: current.label_values.includes(value)
        ? current.label_values.filter((item) => item !== value)
        : [...current.label_values, value],
    }));
  }, []);

  const setAccessMode = useCallback((mode: AccessComposerMode) => {
    setCapabilityForm((current) => ({
      ...current,
      access_mode: mode,
      token_ids: mode === 'all_tokens' || mode === 'specific_agents' || mode === 'token_label' ? [] : current.token_ids,
      agent_ids: mode === 'all_tokens' || mode === 'specific_tokens' || mode === 'token_label' ? [] : current.agent_ids,
      label_key: mode === 'all_tokens' || mode === 'specific_tokens' || mode === 'specific_agents' ? '' : current.label_key,
      label_values: mode === 'all_tokens' || mode === 'specific_tokens' || mode === 'specific_agents' ? [] : current.label_values,
    }));
  }, []);

  const handleCreateSecret = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmittingSecret(true);
      setError(null);
      clearAllAuthErrors();

      try {
        const created = await createSecret({
          display_name: secretForm.display_name.trim(),
          kind: secretForm.kind.trim(),
          value: secretForm.value,
          provider: secretForm.provider.trim(),
          environment: secretForm.environment.trim() || null,
          provider_scopes: parseCommaSeparatedList(secretForm.provider_scopes),
          resource_selector: secretForm.resource_selector.trim() || null,
        });
        setSecretForm({
          display_name: '',
          kind: 'api_token',
          value: '',
          provider: 'openai',
          environment: '',
          provider_scopes: '',
          resource_selector: '',
        });
        setCapabilityForm((current) => ({
          ...current,
          secret_id: created.id,
          required_provider: created.provider ?? current.required_provider,
          required_provider_scopes: (created.provider_scopes ?? []).join(', '),
        }));
        setShowSecretModal(false);
        onSecretCreated?.();
      } catch (submitError) {
        if (consumeUnauthorized(submitError)) {return;}
        if (submitError instanceof ApiError) {
          setError(submitError.detail);
        } else {
          setError(
            submitError instanceof Error ? submitError.message : t('assets.secrets.createFailed')
          );
        }
      } finally {
        setSubmittingSecret(false);
      }
    },
    [createSecret, consumeUnauthorized, clearAllAuthErrors, onSecretCreated, t, secretForm]
  );

  const handleCreateCapability = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!capabilityForm.secret_id) {
        setError(t('assets.capabilities.selectSecretError'));
        return;
      }
      if (capabilityForm.access_mode === 'specific_tokens' && capabilityForm.token_ids.length === 0) {
        setError(t('assets.capabilities.tokenRequiredError'));
        return;
      }
      if (capabilityForm.access_mode === 'specific_agents' && capabilityForm.agent_ids.length === 0) {
        setError(t('assets.capabilities.agentRequiredError'));
        return;
      }
      if (
        capabilityForm.access_mode === 'token_label' &&
        (!capabilityForm.label_key || capabilityForm.label_values.length === 0)
      ) {
        setError(t('assets.capabilities.labelRequiredError'));
        return;
      }

      setSubmittingCapability(true);
      setError(null);
      clearAllAuthErrors();

      try {
        await createCapability({
          name: capabilityForm.name.trim(),
          secret_id: capabilityForm.secret_id,
          risk_level: capabilityForm.risk_level,
          allowed_mode: capabilityForm.allowed_mode,
          lease_ttl_seconds: Number(capabilityForm.lease_ttl_seconds) || 60,
          required_provider: capabilityForm.required_provider.trim() || null,
          required_provider_scopes: parseCommaSeparatedList(capabilityForm.required_provider_scopes),
          access_policy: buildCapabilityAccessPolicy(capabilityForm),
        });
        setCapabilityForm((current) => ({
          ...current,
          name: '',
          risk_level: 'medium',
          allowed_mode: 'proxy_or_lease',
          lease_ttl_seconds: '120',
          required_provider: '',
          required_provider_scopes: '',
          access_mode: 'all_tokens',
          token_ids: [],
          agent_ids: [],
          label_key: '',
          label_values: [],
        }));
        setShowCapabilityModal(false);
        onCapabilityCreated?.();
      } catch (submitError) {
        if (consumeUnauthorized(submitError)) {return;}
        if (submitError instanceof ApiError) {
          setError(submitError.detail);
        } else {
          setError(
            submitError instanceof Error ? submitError.message : t('assets.capabilities.createFailed')
          );
        }
      } finally {
        setSubmittingCapability(false);
      }
    },
    [createCapability, consumeUnauthorized, clearAllAuthErrors, onCapabilityCreated, t, capabilityForm]
  );

  return {
    t,
    error,
    setError,
    showSecretModal,
    openSecretModal,
    closeSecretModal,
    showCapabilityModal,
    openCapabilityModal,
    closeCapabilityModal,
    secretForm,
    setSecretForm,
    capabilityForm,
    setCapabilityForm,
    submittingSecret,
    submittingCapability,
    handleCreateSecret,
    handleCreateCapability,
    handleCapabilitySecretChange,
    toggleCapabilityToken,
    toggleCapabilityAgent,
    toggleCapabilityLabelValue,
    setAccessMode,
  };
}
