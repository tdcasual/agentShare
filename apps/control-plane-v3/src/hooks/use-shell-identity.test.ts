import { describe, expect, it } from 'vitest';
import type { Identity } from '@/domains/identity/types';
import type { SessionData } from '@/lib/session-state';
import { buildShellIdentityState } from '@/hooks/use-shell-identity';

function createIdentity(overrides: Partial<Identity> = {}): Identity {
  return {
    id: 'hmn_demo',
    type: 'human',
    profile: {
      name: 'Demo Human',
      avatar: '/demo-human.png',
      bio: 'Demo operator',
      tags: ['demo'],
      createdAt: new Date('2026-03-31T00:00:00.000Z'),
    },
    status: 'active',
    presence: 'online',
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:00:00.000Z'),
    ...overrides,
  };
}

function createSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    state: 'anonymous',
    lastLoadedAt: Date.now(),
    ...overrides,
  };
}

describe('buildShellIdentityState', () => {
  it('keeps runtime identities on demo routes', () => {
    const runtimeIdentity = createIdentity();
    const onlineIdentity = createIdentity({
      id: 'agt_demo',
      type: 'agent',
      profile: {
        name: 'Demo Agent',
        avatar: '/demo-agent.png',
        bio: 'Demo agent',
        tags: ['demo'],
        createdAt: new Date('2026-03-31T00:00:00.000Z'),
      },
    });

    const result = buildShellIdentityState({
      pathname: '/demo/identities',
      session: createSession({
        state: 'authenticated',
        email: 'owner@example.com',
        role: 'owner',
      }),
      runtime: {
        currentIdentity: runtimeIdentity,
        onlineIdentities: [runtimeIdentity, onlineIdentity],
      },
    });

    expect(result.currentIdentity).toBe(runtimeIdentity);
    expect(result.onlineIdentities).toEqual([runtimeIdentity, onlineIdentity]);
  });

  it('returns session-backed shell identity on management routes', () => {
    const runtimeIdentity = createIdentity();

    const result = buildShellIdentityState({
      pathname: '/tokens',
      session: createSession({
        state: 'authenticated',
        email: 'owner@example.com',
        role: 'owner',
        sessionId: 'sess_owner',
      }),
      runtime: {
        currentIdentity: runtimeIdentity,
        onlineIdentities: [runtimeIdentity],
      },
    });

    expect(result.currentIdentity?.id).toBe('session:sess_owner');
    expect(result.currentIdentity?.profile.name).toContain('owner@example.com');
    expect(result.currentIdentity?.session?.managementRole).toBe('owner');
    expect(result.onlineIdentities).toEqual([]);
  });
});
