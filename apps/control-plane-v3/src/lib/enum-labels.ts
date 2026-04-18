import {
  governanceStatusTranslationKey,
  normalizeGovernancePublicationStatus,
} from '@/domains/governance/types';

type Translator = (key: string, values?: Record<string, string | number>) => string;

export function translateAccountRole(t: Translator, role: string) {
  switch (role) {
    case 'owner':
    case 'admin':
    case 'operator':
    case 'viewer':
      return t(`settings.roles.${role}`);
    default:
      return role;
  }
}

export function translateAccountStatus(t: Translator, status: string) {
  switch (status) {
    case 'active':
    case 'inactive':
      return t(`settings.status.${status}`);
    default:
      return status;
  }
}

export function translateAgentStatus(t: Translator, status: string) {
  switch (status) {
    case 'active':
    case 'inactive':
      return t(`common.${status}`);
    case 'online':
    case 'offline':
    case 'busy':
    case 'away':
      return t(`identities.status.${status}`);
    default:
      return status;
  }
}

export function translateTokenStatus(t: Translator, status: string) {
  switch (status) {
    case 'active':
    case 'inactive':
      return t(`common.${status}`);
    case 'revoked':
      return t('tokens.status.revoked');
    default:
      return status;
  }
}

export function translateSpaceStatus(t: Translator, status: string) {
  switch (status) {
    case 'active':
    case 'inactive':
      return t(`common.${status}`);
    case 'paused':
    case 'archived':
      return t(`tasks.publication.${status}`);
    default:
      return status;
  }
}

export function translateTaskStatus(t: Translator, status: string) {
  switch (status) {
    case 'pending':
    case 'running':
    case 'claimed':
    case 'completed':
    case 'failed':
    case 'cancelled':
      return t(`tasks.status.${status}`);
    default:
      return status;
  }
}

export function translatePublicationStatus(t: Translator, status: string) {
  switch (status) {
    case 'draft':
    case 'active':
    case 'paused':
    case 'archived':
      return t(`tasks.publication.${status}`);
    case 'pending':
    case 'pending_review':
    case 'approved':
    case 'rejected':
    case 'expired':
      return t(governanceStatusTranslationKey(normalizeGovernancePublicationStatus(status)));
    default:
      return status;
  }
}

export function translatePlaybookTaskType(t: Translator, taskType: string) {
  switch (taskType) {
    case 'analysis':
      return t('playbooks.taskTypes.analysis');
    case 'code_review':
      return t('playbooks.taskTypes.codeReview');
    case 'deployment':
      return t('playbooks.taskTypes.deployment');
    case 'documentation':
      return t('playbooks.taskTypes.documentation');
    case 'testing':
      return t('playbooks.taskTypes.testing');
    default:
      return taskType;
  }
}

export function translateSpaceMemberRole(t: Translator, role: string) {
  switch (role) {
    case 'admin':
    case 'operator':
    case 'viewer':
    case 'participant':
      return t(`spaces.memberManager.roles.${role}`);
    default:
      return role;
  }
}

export function translateDreamRunStatus(t: Translator, status: string) {
  switch (status) {
    case 'active':
      return t('common.active');
    case 'paused':
    case 'stopped':
      return t(`identities.sections.dreamRunStatus.${status}`);
    default:
      return status;
  }
}
