// ============================================
// Identity Domain Plugin
// ============================================

import type { Plugin, CoreRuntime } from '../../core/plugin/types';
import { IdentityRegistryImpl, IdentityRegistryServiceId } from './services/identity-registry';

export class IdentityDomainPlugin implements Plugin {
  readonly id = 'domain.identity';
  readonly version = '1.0.0';
  readonly dependencies = ['core.runtime'];

  private runtime!: CoreRuntime;
  private registry!: IdentityRegistryImpl;

  install(runtime: CoreRuntime): void {
    this.runtime = runtime;
    
    // Register identity registry service
    this.registry = new IdentityRegistryImpl(runtime);
    runtime.di.register(IdentityRegistryServiceId, this.registry);
    
    // Create identity state store
    runtime.state.create('identity.current', (set, get) => ({
      currentIdentity: null as Identity | null,
      isAuthenticated: false,
      
      setCurrentIdentity: (identity: Identity | null) => {
        set({ currentIdentity: identity, isAuthenticated: !!identity });
      },
      
      logout: () => {
        set({ currentIdentity: null, isAuthenticated: false });
      }
    }));
  }

  activate(): void {
    // Seed with demo identities
    this.seedDemoData();
    
    console.log('Identity domain activated');
  }

  deactivate(): void {
    console.log('Identity domain deactivated');
  }

  uninstall(): void {
    // Cleanup
  }

  private seedDemoData(): void {
    // Create demo human
    this.registry.registerHuman({
      type: 'human',
      profile: {
        name: 'Alice Chen',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        bio: 'Platform Engineer',
        tags: ['devops', 'kubernetes', 'automation'],
        createdAt: new Date(),
      },
      credentials: {
        primary: {
          id: 'cred_001',
          type: 'api_key',
          createdAt: new Date(),
        }
      },
      capabilities: {
        canCreate: ['api_key', 'secret', 'task', 'workflow', 'capability'],
        canExecute: ['deploy', 'configure', 'audit'],
        maxRiskTier: 'high',
        allowedScopes: ['*'],
      },
      status: 'active',
      presence: 'online',
      relationships: {
        trusts: [],
        trustedBy: [],
        delegates: [],
        delegatedBy: [],
      },
    });

    // Create demo agent
    this.registry.registerAgent({
      type: 'agent',
      profile: {
        name: 'DeployBot-7',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeployBot',
        bio: 'Kubernetes deployment specialist',
        tags: ['deployment', 'kubernetes', 'ci-cd'],
        createdAt: new Date(),
      },
      credentials: {
        primary: {
          id: 'cred_002',
          type: 'api_key',
          createdAt: new Date(),
        }
      },
      capabilities: {
        canCreate: ['task', 'workflow'],
        canExecute: ['deploy', 'verify', 'rollback'],
        maxRiskTier: 'medium',
        allowedScopes: ['deployment/*'],
      },
      status: 'active',
      presence: 'online',
      relationships: {
        trusts: [],
        trustedBy: [],
        delegates: [],
        delegatedBy: [],
      },
      runtime: {
        adapterType: 'mcp',
        endpoint: 'http://localhost:8000/mcp',
        maxConcurrent: 5,
        timeout: 30000,
      },
    });

    // Create another agent
    this.registry.registerAgent({
      type: 'agent',
      profile: {
        name: 'DataAnalyzer',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DataAnalyzer',
        bio: 'Data processing and analytics',
        tags: ['analytics', 'python', 'sql'],
        createdAt: new Date(),
      },
      credentials: {
        primary: {
          id: 'cred_003',
          type: 'api_key',
          createdAt: new Date(),
        }
      },
      capabilities: {
        canCreate: ['task', 'workflow'],
        canExecute: ['analyze', 'transform', 'report'],
        maxRiskTier: 'low',
        allowedScopes: ['analytics/*'],
      },
      status: 'active',
      presence: 'away',
      relationships: {
        trusts: [],
        trustedBy: [],
        delegates: [],
        delegatedBy: [],
      },
      runtime: {
        adapterType: 'openai',
        maxConcurrent: 3,
        timeout: 60000,
      },
    });

    console.log('Demo identities seeded');
  }
}

// Import Identity type for the store
import type { Identity } from '../../shared/types';
