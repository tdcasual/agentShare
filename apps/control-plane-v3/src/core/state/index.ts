// ============================================
// State Management
// ============================================

import type { StateContainer, Store, StateInitializer, Disposable } from '../plugin/types';

export class StateContainerImpl implements StateContainer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stores = new Map<string, StoreImpl<any>>();

  create<T>(name: string, initializer: StateInitializer<T>): Store<T> {
    if (this.stores.has(name)) {
      throw new Error(`Store ${name} already exists`);
    }

    const store = new StoreImpl<T>(name, initializer);
    this.stores.set(name, store);
    return store;
  }

  get<T>(name: string): Store<T> | undefined {
    return this.stores.get(name) as Store<T> | undefined;
  }

  delete(name: string): void {
    const store = this.stores.get(name);
    if (store) {
      store.dispose();
      this.stores.delete(name);
    }
  }

  getAllNames(): string[] {
    return Array.from(this.stores.keys());
  }
}

class StoreImpl<T> implements Store<T> {
  private state: T;
  private listeners = new Set<(state: T, prevState: T) => void>();

  constructor(
    public readonly name: string,
    initializer: StateInitializer<T>
  ) {
    const setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void = (partial) => {
      const prevState = this.state;
      const changes = typeof partial === 'function' 
        ? (partial as (state: T) => Partial<T>)(this.state)
        : partial;
      
      this.state = { ...this.state, ...changes };
      this.notify(prevState);
    };

    const getState = () => this.state;

    this.state = initializer(setState, getState);
  }

  getState(): T {
    return this.state;
  }

  setState = (partial: Partial<T> | ((state: T) => Partial<T>)): void => {
    const prevState = this.state;
    const changes = typeof partial === 'function'
      ? (partial as (state: T) => Partial<T>)(this.state)
      : partial;

    this.state = { ...this.state, ...changes };
    this.notify(prevState);
  };

  subscribe(listener: (state: T, prevState: T) => void): Disposable {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(prevState: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error(`Error in store ${this.name} listener:`, err);
      }
    });
  }

  dispose(): void {
    this.listeners.clear();
  }
}

// React integration helper
export function createReactHook<T>(store: Store<T>) {
  return function useStore(): [T, Store<T>['setState']] {
    const [state, setState] = (require('react').useState)(store.getState());
    
    (require('react').useEffect)(() => {
      return store.subscribe((newState) => {
        setState(newState);
      });
    }, []);

    return [state, store.setState];
  };
}

// Selector helper for derived state
export function createSelector<T, R>(
  store: Store<T>,
  selectorFn: (state: T) => R
): Store<R> {
  const storeName = (store as StoreImpl<T>).name;
  const selectorStore = new StoreImpl<R>(
    `${storeName}.selector`,
    () => selectorFn((store as StoreImpl<T>).getState())
  );

  store.subscribe((state) => {
    selectorStore.setState(selectorFn(state) as Partial<R>);
  });

  return selectorStore;
}
