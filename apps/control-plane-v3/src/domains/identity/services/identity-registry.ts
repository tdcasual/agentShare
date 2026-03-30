// ============================================
// Identity Registry Service
// Core of the Dual Cosmos
// ============================================

import type { 
  Identity, 
  HumanIdentity, 
  AgentIdentity,
  IdentityReference,
  IdentityType,
  PresenceStatus,
  Disposable 
} from '../../../shared/types';
import { createServiceIdentifier } from '../../../core/plugin/types';
import type { CoreRuntime } from '../../../core/plugin/types';

export const IdentityRegistryServiceId = createServiceIdentifier<IdentityRegistry>('services.identity-registry');

export interface IdentityRegistry {
  // Registration
  registerHuman(identity: Omit<HumanIdentity, 'id' | 'createdAt' | 'updatedAt'>): HumanIdentity;
  registerAgent(identity: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): AgentIdentity;
  unregister(identityId: string): void;
  
  // Retrieval
  getById(id: string): Identity | undefined;
  getByType(type: IdentityType): Identity[];
  getAll(): Identity[];
  
  // Presence
  setPresence(identityId: string, status: PresenceStatus): void;
  getPresence(identityId: string): PresenceStatus;
  
  // Search
  search(query: string): Identity[];
  findByTag(tag: string): Identity[];
  findByCapability(capability: string): Identity[];
  
  // References
  toReference(identity: Identity): IdentityReference;
  
  // Events
  onIdentityCreated(handler: (identity: Identity) => void): Disposable;
  onIdentityUpdated(handler: (identity: Identity) => void): Disposable;
  onPresenceChanged(handler: (identityId: string, presence: PresenceStatus) => void): Disposable;
}

export class IdentityRegistryImpl implements IdentityRegistry {
  private identities = new Map<string, Identity>();
  private presence = new Map<string, PresenceStatus>();
  private runtime: CoreRuntime;

  constructor(runtime: CoreRuntime) {
    this.runtime = runtime;
  }

  registerHuman(identityData: Omit<HumanIdentity, 'id' | 'createdAt' | 'updatedAt'>): HumanIdentity {
    const id = this.generateId('human');
    const now = new Date();
    const identity: HumanIdentity = {
      ...identityData,
      id,
      createdAt: now,
      updatedAt: now,
    } as HumanIdentity;

    this.identities.set(id, identity);
    this.presence.set(id, 'offline');
    
    this.runtime.event.emit('identity:created', { identity });
    
    return identity;
  }

  registerAgent(identityData: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): AgentIdentity {
    const id = this.generateId('agent');
    const now = new Date();
    const identity: AgentIdentity = {
      ...identityData,
      id,
      createdAt: now,
      updatedAt: now,
    } as AgentIdentity;

    this.identities.set(id, identity);
    this.presence.set(id, 'offline');
    
    this.runtime.event.emit('identity:created', { identity });
    
    return identity;
  }

  unregister(identityId: string): void {
    this.identities.delete(identityId);
    this.presence.delete(identityId);
  }

  getById(id: string): Identity | undefined {
    return this.identities.get(id);
  }

  getByType(type: IdentityType): Identity[] {
    return Array.from(this.identities.values()).filter(i => i.type === type);
  }

  getAll(): Identity[] {
    return Array.from(this.identities.values());
  }

  setPresence(identityId: string, status: PresenceStatus): void {
    const prevStatus = this.presence.get(identityId);
    if (prevStatus !== status) {
      this.presence.set(identityId, status);
      
      const identity = this.identities.get(identityId);
      if (identity) {
        identity.presence = status;
      }
      
      this.runtime.event.emit('identity:presence:changed', { identityId, presence: status });
    }
  }

  getPresence(identityId: string): PresenceStatus {
    return this.presence.get(identityId) || 'offline';
  }

  search(query: string): Identity[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.identities.values()).filter(identity => {
      return (
        identity.profile.name.toLowerCase().includes(lowerQuery) ||
        identity.profile.bio?.toLowerCase().includes(lowerQuery) ||
        identity.profile.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  findByTag(tag: string): Identity[] {
    return Array.from(this.identities.values()).filter(identity =>
      identity.profile.tags.includes(tag)
    );
  }

  findByCapability(capability: string): Identity[] {
    return Array.from(this.identities.values()).filter(identity =>
      identity.capabilities?.canExecute.includes(capability)
    );
  }

  toReference(identity: Identity): IdentityReference {
    return {
      id: identity.id,
      type: identity.type,
      name: identity.profile.name,
      avatar: identity.profile.avatar,
    };
  }

  onIdentityCreated(handler: (identity: Identity) => void): Disposable {
    return this.runtime.event.on('identity:created', (payload: unknown) => {
      const { identity } = payload as { identity: Identity };
      handler(identity);
    });
  }

  onIdentityUpdated(handler: (identity: Identity) => void): Disposable {
    return this.runtime.event.on('identity:updated', (payload: unknown) => {
      const { identityId, changes } = payload as { identityId: string; changes: Partial<Identity> };
      const identity = this.identities.get(identityId);
      if (identity) {
        Object.assign(identity, changes);
        handler(identity);
      }
    });
  }

  onPresenceChanged(handler: (identityId: string, presence: PresenceStatus) => void): Disposable {
    return this.runtime.event.on('identity:presence:changed', (payload: unknown) => {
      const { identityId, presence } = payload as { identityId: string; presence: PresenceStatus };
      handler(identityId, presence);
    });
  }

  private generateId(type: IdentityType): string {
    const prefix = type === 'human' ? 'hmn' : 'agt';
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}`;
  }
}
