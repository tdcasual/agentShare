'use client';

import { Dispatch, FormEvent, SetStateAction, memo, useCallback, useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Layout } from '@/interfaces/human/layout';
import { useAccessTokens, useCreateAccessToken, useRevokeAccessToken } from '@/domains/identity';
import { ApiError, type AccessTokenCreateInput } from '@/lib/api-client';
import {
  ManagementPageAlerts,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';
import { StatDisplay } from '@/shared/ui-primitives/stat-display';
import { translateAccountRole, translateTokenStatus } from '@/lib/enum-labels';

export default function TokensPage() {
  return (
    <Layout>
      <TokensContent />
    </Layout>
  );
}

const TOKENS_POLLING_CONFIG = { refreshInterval: 10_000 };

const TokensContent = memo(function TokensContent() {
  const { locale, t } = useI18n();
  const { data, isLoading, error: dataError, mutate } = useAccessTokens(TOKENS_POLLING_CONFIG);
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);

  const createAccessToken = useCreateAccessToken();
  const revokeAccessToken = useRevokeAccessToken();

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<
    'all' | 'needs_feedback' | 'low_trust'
  >('all');
  const [submitting, setSubmitting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{
    label: string;
    prefix: string;
    apiKey: string;
  } | null>(null);
  const [createTokenForm, setCreateTokenForm] = useState({
    display_name: '',
    subject_type: 'automation',
    subject_id: '',
    scopes: 'runtime',
    labels: '',
    expires_at: '',
  });

  const accessTokens = data?.items ?? [];
  const activeTokens = useMemo(
    () => accessTokens.filter((token) => token.status === 'active').length,
    [accessTokens]
  );
  const averageTrust = useMemo(
    () =>
      accessTokens.length > 0
        ? accessTokens.reduce((total, token) => total + (token.trustScore ?? 0), 0) /
          accessTokens.length
        : 0,
    [accessTokens]
  );
  const tokensWithFeedback = useMemo(
    () => accessTokens.filter((token) => token.lastFeedbackAt).length,
    [accessTokens]
  );
  const tokensNeedingFeedback = useMemo(
    () => accessTokens.filter((token) => !token.lastFeedbackAt).length,
    [accessTokens]
  );
  const lowTrustTokens = useMemo(
    () => accessTokens.filter((token) => (token.trustScore ?? 0) < 0.6).length,
    [accessTokens]
  );

  const visibleTokens = useMemo(() => {
    return accessTokens.filter((token) => {
      if (selectedHealthFilter === 'needs_feedback') {
        return !token.lastFeedbackAt;
      }
      if (selectedHealthFilter === 'low_trust') {
        return (token.trustScore ?? 0) < 0.6;
      }
      return true;
    });
  }, [accessTokens, selectedHealthFilter]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    clearAllAuthErrors();

    try {
      await mutate();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('tokens.errors.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    clearAllAuthErrors();

    try {
      const payload: AccessTokenCreateInput = {
        display_name: createTokenForm.display_name.trim(),
        subject_type: createTokenForm.subject_type.trim() || 'automation',
        subject_id: createTokenForm.subject_id.trim(),
        scopes: parseCommaSeparatedList(createTokenForm.scopes),
        labels: parseLabels(createTokenForm.labels),
        expires_at: createTokenForm.expires_at
          ? new Date(createTokenForm.expires_at).toISOString()
          : null,
      };
      const created = await createAccessToken(payload);
      setRevealedSecret({
        label: created.display_name,
        prefix: created.token_prefix,
        apiKey: created.api_key ?? '',
      });
      setCreateTokenForm({
        display_name: '',
        subject_type: 'automation',
        subject_id: '',
        scopes: 'runtime',
        labels: '',
        expires_at: '',
      });
      setShowCreateTokenModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(submitError instanceof Error ? submitError.message : t('tokens.errors.mintTokenFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const handleRevokeToken = useCallback(
    async (tokenId: string) => {
      setError(null);
      clearAllAuthErrors();

      try {
        await revokeAccessToken(tokenId);
      } catch (revokeError) {
        if (consumeUnauthorized(revokeError)) {
          return;
        }

        if (revokeError instanceof ApiError) {
          setError(revokeError.detail);
        } else {
          setError(
            revokeError instanceof Error ? revokeError.message : t('tokens.errors.revokeTokenFailed')
          );
        }
      }
    },
    [clearAllAuthErrors, consumeUnauthorized, revokeAccessToken, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-surface)]/80">
            <ShieldCheck className="h-4 w-4" />
            {t('tokens.remoteAccessSupervision')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tokens.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tokens.remoteAccessSupervisionDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('tokens.actions.refresh')}
          </Button>
          <Button onClick={() => setShowCreateTokenModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tokens.actions.issueAccessToken')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('tokens.metrics.activeTokens')}
          value={activeTokens.toString()}
          hint={t('tokens.hints.activeTokens')}
        />
        <MetricCard
          label={t('tokens.metrics.feedbackCoverage')}
          value={tokensWithFeedback.toString()}
          hint={t('tokens.hints.feedbackCoverage')}
        />
        <MetricCard
          label={t('tokens.metrics.needsFeedback')}
          value={tokensNeedingFeedback.toString()}
          hint={t('tokens.hints.needsFeedback')}
        />
        <MetricCard
          label={t('tokens.metrics.averageTrust')}
          value={averageTrust.toFixed(2)}
          hint={t('tokens.hints.averageTrust')}
        />
      </div>

      <Card className="border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/90">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tokens.remoteAccessSupervision')}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tokens.remoteAccessSupervisionDesc')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <Badge variant="secondary">
              {t('tokens.badge.needsFeedback', {
                count: tokensNeedingFeedback,
                suffix: tokensNeedingFeedback === 1 ? '' : 's',
                verbSuffix: tokensNeedingFeedback === 1 ? '' : 's',
              })}
            </Badge>
            <Badge variant="info">
              {t('tokens.badge.lowTrust', {
                count: lowTrustTokens,
                suffix: lowTrustTokens === 1 ? '' : 's',
              })}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={selectedHealthFilter === 'all'}
              aria-pressed={selectedHealthFilter === 'all'}
              label={t('tokens.filters.all')}
              onClick={() => setSelectedHealthFilter('all')}
            />
            <FilterButton
              active={selectedHealthFilter === 'needs_feedback'}
              aria-pressed={selectedHealthFilter === 'needs_feedback'}
              label={t('tokens.filters.needsFeedback')}
              onClick={() => setSelectedHealthFilter('needs_feedback')}
            />
            <FilterButton
              active={selectedHealthFilter === 'low_trust'}
              aria-pressed={selectedHealthFilter === 'low_trust'}
              label={t('tokens.filters.lowTrust')}
              onClick={() => setSelectedHealthFilter('low_trust')}
            />
          </div>
        </div>
      </Card>

      <ManagementPageAlerts
        shouldShowSessionExpired={shouldShowSessionExpired}
        shouldShowForbidden={shouldShowForbidden}
        refreshError={refreshError}
        gateError={gateError}
        error={error}
        dataError={dataError}
        sessionExpiredMessage={t('tokens.sessionExpired')}
        forbiddenMessage={t('tokens.sessionForbidden')}
        dataErrorMessage={t('tokens.errors.loadFailed')}
      />

      {gateLoading || isLoading ? (
        <Card className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {t('tokens.loading')}
        </Card>
      ) : null}

      {!gateLoading && !isLoading && accessTokens.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-500)]">
            <KeyRound className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tokens.empty.title')}
            </h2>
            <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tokens.empty.description')}
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleTokens.map((token) => (
          <Card
            key={token.id}
            className="space-y-4 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/90"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={token.status === 'active' ? 'success' : 'warning'}>
                    {translateTokenStatus(t, token.status)}
                  </Badge>
                  <Badge variant="secondary">{token.subjectType}</Badge>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                    {token.displayName}
                  </h2>
                  <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {token.subjectId}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={token.status !== 'active'}
                onClick={() => handleRevokeToken(token.id)}
              >
                {t('tokens.actions.revoke')}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StatDisplay
                icon={<Star className="h-4 w-4" />}
                label={t('tokens.metrics.averageTrust')}
                value={(token.trustScore ?? 0).toFixed(2)}
              />
              <StatDisplay
                icon={<KeyRound className="h-4 w-4" />}
                label={t('tokens.metrics.feedbackCoverage')}
                value={(token.completedRuns ?? 0).toString()}
              />
              <StatDisplay
                icon={<ShieldCheck className="h-4 w-4" />}
                label={t('tokens.metrics.activeTokens')}
                value={token.lastFeedbackAt ? t('common.active') : t('tokens.noFeedback')}
              />
            </div>

            <div className="space-y-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              <p>{t('tokens.labels.tokenPrefix')}: {token.tokenPrefix}</p>
              <p>{t('tokens.labels.scopes')}: {token.scopes.join(', ') || t('tokens.none')}</p>
              <p>{t('tokens.labels.lastUsedAt')}: {token.lastUsedAt ?? t('tokens.neverUsed')}</p>
              <p>{t('tokens.labels.issuedBy')}: {token.issuedByActorId ?? t('tokens.unknownIssuer')}</p>
            </div>
          </Card>
        ))}
      </div>

      <CreateAccessTokenModal
        form={createTokenForm}
        locale={locale}
        error={error}
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        onSubmit={handleCreateToken}
        onChange={setCreateTokenForm}
        submitting={submitting}
        t={t}
      />

      <Modal
        isOpen={revealedSecret !== null}
        onClose={() => setRevealedSecret(null)}
        title={t('tokens.secretModal.title')}
        description={revealedSecret?.label}
      >
        {revealedSecret ? (
          <div className="space-y-4">
            <Card className="space-y-3 bg-[var(--kw-primary-50)]/40">
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {revealedSecret.prefix}
              </p>
              <p className="break-all font-mono text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {revealedSecret.apiKey}
              </p>
            </Card>
            <Button
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(revealedSecret.apiKey)}
            >
              <Copy className="mr-2 h-4 w-4" />
              {t('tokens.actions.copySecret')}
            </Button>
          </div>
        ) : null}
      </Modal>

      {session ? (
        <div className="flex items-center gap-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <Star className="h-4 w-4" />
          {translateAccountRole(t, session.role)}
        </div>
      ) : null}
    </div>
  );
});

function CreateAccessTokenModal({
  form,
  locale,
  error,
  isOpen,
  onClose,
  onSubmit,
  onChange,
  submitting,
  t,
}: {
  form: {
    display_name: string;
    subject_type: string;
    subject_id: string;
    scopes: string;
    labels: string;
    expires_at: string;
  };
  locale: string;
  error: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: Dispatch<
    SetStateAction<{
      display_name: string;
      subject_type: string;
      subject_id: string;
      scopes: string;
      labels: string;
      expires_at: string;
    }>
  >;
  submitting: boolean;
  t: (key: string) => string;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tokens.actions.issueAccessToken')}
      description={t('tokens.form.issueDescription')}
      size="lg"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label={t('tokens.form.displayName')}
          value={form.display_name}
          onChange={(event) =>
            onChange((current) => ({ ...current, display_name: event.target.value }))
          }
          placeholder={t('tokens.form.displayNamePlaceholder')}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={t('tokens.form.subjectType')}
            value={form.subject_type}
            onChange={(event) =>
              onChange((current) => ({ ...current, subject_type: event.target.value }))
            }
            placeholder="automation"
            required
          />
          <Input
            label={t('tokens.form.subjectId')}
            value={form.subject_id}
            onChange={(event) =>
              onChange((current) => ({ ...current, subject_id: event.target.value }))
            }
            placeholder={t('tokens.form.subjectIdPlaceholder')}
            required
          />
        </div>
        <Input
          label={t('tokens.form.scopes')}
          value={form.scopes}
          onChange={(event) => onChange((current) => ({ ...current, scopes: event.target.value }))}
          placeholder="runtime"
        />
        <Input
          label={t('tokens.form.labels')}
          value={form.labels}
          onChange={(event) => onChange((current) => ({ ...current, labels: event.target.value }))}
          placeholder={t('tokens.form.labelsPlaceholder')}
        />
        <Input
          type="datetime-local"
          label={t('tokens.form.expiresAt')}
          value={form.expires_at}
          onChange={(event) =>
            onChange((current) => ({ ...current, expires_at: event.target.value }))
          }
          lang={locale}
        />
        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)]"
          >
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {t('tokens.actions.issueAccessToken')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FilterButton({
  active,
  'aria-pressed': ariaPressed,
  label,
  onClick,
}: {
  active: boolean;
  'aria-pressed'?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? 'border-[var(--kw-primary-300)] bg-[var(--kw-primary-50)] text-[var(--kw-primary-700)]'
          : 'border-[var(--kw-border)] bg-white text-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-surface)]'
      }`}
    >
      {label}
    </button>
  );
}

function parseCommaSeparatedList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLabels(raw: string): Record<string, string> {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((labels, item) => {
      const [key, value] = item.split(':').map((part) => part.trim());
      if (key && value) {
        labels[key] = value;
      }
      return labels;
    }, {});
}
