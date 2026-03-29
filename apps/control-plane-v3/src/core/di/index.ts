// ============================================
// Dependency Injection Container
// ============================================

import type { 
  DIContainer, 
  DIScope, 
  ServiceIdentifier, 
  Constructor 
} from '../plugin/types';

export class DIContainerImpl implements DIContainer {
  private registrations = new Map<symbol, { 
    implementation: Constructor<unknown> | unknown;
    singleton: boolean;
    instance?: unknown;
  }>();

  register<T>(
    id: ServiceIdentifier<T>, 
    implementation: Constructor<T> | T
  ): void {
    const isConstructor = typeof implementation === 'function' &&
      implementation.prototype &&
      implementation.prototype.constructor === implementation;

    this.registrations.set(id.symbol, {
      implementation,
      singleton: !isConstructor,
    });
  }

  resolve<T>(id: ServiceIdentifier<T>): T {
    const registration = this.registrations.get(id.symbol);
    if (!registration) {
      throw new Error(`Service ${id.name} is not registered`);
    }

    // Return singleton instance
    if (registration.singleton) {
      return registration.implementation as T;
    }

    // Return cached singleton instance
    if (registration.instance) {
      return registration.instance as T;
    }

    // Create new instance
    const Constructor = registration.implementation as Constructor<T>;
    const instance = new Constructor();
    registration.instance = instance;
    return instance;
  }

  async resolveAsync<T>(id: ServiceIdentifier<T>): Promise<T> {
    const result = this.resolve(id);
    
    // Check if result has async initialization
    const initializable = result as unknown as { initialize?: () => Promise<void> };
    if (initializable && typeof initializable.initialize === 'function') {
      await initializable.initialize();
    }
    
    return result;
  }

  createScope(): DIScope {
    return new DIScopeImpl(this);
  }

  isRegistered<T>(id: ServiceIdentifier<T>): boolean {
    return this.registrations.has(id.symbol);
  }
}

class DIScopeImpl implements DIScope {
  private scopedRegistrations = new Map<symbol, unknown>();

  constructor(private parent: DIContainerImpl) {}

  register<T>(id: ServiceIdentifier<T>, implementation: Constructor<T> | T): void {
    this.scopedRegistrations.set(id.symbol, implementation);
  }

  resolve<T>(id: ServiceIdentifier<T>): T {
    // Check scoped registrations first
    const scoped = this.scopedRegistrations.get(id.symbol);
    if (scoped) {
      return scoped as T;
    }

    // Fall back to parent container
    return this.parent.resolve(id);
  }

  dispose(): void {
    // Cleanup scoped instances
    this.scopedRegistrations.clear();
  }
}

// Decorator for auto-registration (if using decorators)
export function injectable<T>() {
  return function (target: Constructor<T>) {
    // Mark as injectable
    (target as unknown as { __injectable: boolean }).__injectable = true;
    return target;
  };
}

export function inject<T>(id: ServiceIdentifier<T>) {
  return function (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store injection metadata
    const existingInjections = (target as { __injections?: Array<{ index: number; id: ServiceIdentifier<unknown> }> }).__injections || [];
    existingInjections.push({ index: parameterIndex, id: id as ServiceIdentifier<unknown> });
    (target as { __injections: typeof existingInjections }).__injections = existingInjections;
  };
}
