// ============================================
// Event Bus Implementation
// ============================================

import type { EventBus, Disposable } from '../plugin/types';

export class EventBusImpl implements EventBus {
  private handlers = new Map<string, Set<(payload: unknown) => void | Promise<void>>>();
  private onceHandlers = new Map<string, Set<(payload: unknown) => void>>();

  emit<K extends string>(event: K, payload: unknown): void {
    // Execute regular handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          const result = handler(payload);
          if (result instanceof Promise) {
            result.catch(err => console.error(`Error in event handler for ${event}:`, err));
          }
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }

    // Execute once handlers
    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Error in once handler for ${event}:`, err);
        }
      });
      this.onceHandlers.delete(event);
    }
  }

  on<K extends string>(
    event: K, 
    handler: (payload: unknown) => void | Promise<void>
  ): Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  once<K extends string>(
    event: K, 
    handler: (payload: unknown) => void
  ): Disposable {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler);

    return () => {
      this.onceHandlers.get(event)?.delete(handler);
    };
  }

  off<K extends string>(
    event: K, 
    handler: (payload: unknown) => void
  ): void {
    this.handlers.get(event)?.delete(handler);
    this.onceHandlers.get(event)?.delete(handler);
  }

  // Debug helper
  getActiveEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  getHandlerCount(event: string): number {
    return (this.handlers.get(event)?.size || 0) + 
           (this.onceHandlers.get(event)?.size || 0);
  }
}

// Typed event emitter wrapper for better type safety
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventBus<Events = any> {
  constructor(private bus: EventBus) {}

  emit<K extends keyof Events & string>(
    event: K, 
    payload: Events[K]
  ): void {
    this.bus.emit(event, payload);
  }

  on<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K]) => void | Promise<void>
  ): Disposable {
    return this.bus.on(event, handler as (payload: unknown) => void | Promise<void>);
  }

  once<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K]) => void
  ): Disposable {
    return this.bus.once(event, handler as (payload: unknown) => void);
  }

  off<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K]) => void
  ): void {
    this.bus.off(event, handler as (payload: unknown) => void);
  }
}
