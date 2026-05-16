import { useMemo } from 'react';
import { useSession } from '@/lib/session-state';
import type { Identity } from '@/domains/identity/types';

function createSessionShellIdentity(session: {
  state: string;
  role?: string;
  email?: string;
  sessionId?: string;
  error?: string;
}): Identity | null {
  if (session.state !== 'authenticated') {
    return null;
  }

  const createdAt = new Date('1970-01-01T00:00:00.000Z');
  const role = session.role ?? 'operator';
  const email = session.email?.trim();
  const identityId = session.sessionId ?? email ?? role;

  return {
    id: `session:${identityId}`,
    type: 'human',
    profile: {
      name: email && email.length > 0 ? email : `Management ${role}`,
      avatar: '',
      bio: email && email.length > 0 ? `Signed in as ${email}` : 'Signed-in management operator',
      tags: [`role:${role}`],
      createdAt,
    },
    status: 'active',
    presence: 'online',
    session: {
      managementRole: role,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function resolveSessionShellError(session: { state: string; error?: string }): Error | null {
  if (session.state === 'forbidden') {
    return new Error(session.error ?? 'Management access is forbidden');
  }

  if (session.state === 'unavailable') {
    return new Error(session.error ?? 'Management session is unavailable');
  }

  return null;
}

/**
 * Management-only shell identity hook.
 *
 * This hook should only be used in management layout surfaces.
 * It does not depend on the runtime context and is safe to call
 * when the runtime provider is not initialized.
 */
export function useManagementShellIdentity() {
  const { session, isLoading, refresh } = useSession();

  const currentIdentity = useMemo(() => createSessionShellIdentity(session), [session]);
  const error = useMemo(() => resolveSessionShellError(session), [session]);

  return {
    currentIdentity,
    onlineIdentities: [] as Identity[],
    isLoading,
    error,
    refresh,
  };
}
