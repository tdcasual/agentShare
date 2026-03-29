// ============================================
// Core Runtime - Composition Root
// ============================================

import type { CoreRuntime, RouteConfig, Disposable, ThemeDefinition } from './plugin/types';
import { PluginRegistry } from './plugin';
import { EventBusImpl, TypedEventBus } from './event';
import { DIContainerImpl } from './di';
import { StateContainerImpl } from './state';
import type { DomainEvents } from '../shared/types';

// Placeholder implementations for now
class RouterManagerImpl {
  private routes: Map<string, RouteConfig> = new Map();
  
  register(route: RouteConfig): Disposable {
    this.routes.set(route.path, route);
    return () => { this.routes.delete(route.path); };
  }
  
  navigate(path: string): void {
    console.log(`Navigating to: ${path}`);
  }
  
  getCurrentRoute(): RouteConfig | undefined {
    return undefined;
  }
}

class ConfigStoreImpl {
  private configs = new Map<string, unknown>();
  private subscribers = new Map<string, Set<(value: unknown) => void>>();

  get<T>(key: string): T | undefined {
    return this.configs.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.configs.set(key, value);
    this.subscribers.get(key)?.forEach(cb => cb(value));
  }

  delete(key: string): void {
    this.configs.delete(key);
  }

  has(key: string): boolean {
    return this.configs.has(key);
  }

  subscribe<T>(key: string, handler: (value: T | undefined) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(handler as (value: unknown) => void);
    
    return () => {
      this.subscribers.get(key)?.delete(handler as (value: unknown) => void);
    };
  }
}

class ThemeEngineImpl {
  private themes = new Map<string, ThemeDefinition>();
  private currentThemeId: string = 'default';
  private listeners = new Set<(theme: ThemeDefinition) => void>();

  register(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  async activate(themeId: string): Promise<void> {
    this.currentThemeId = themeId;
  }

  getCurrent(): ThemeDefinition {
    return this.themes.get(this.currentThemeId) ?? {
      id: 'default',
      name: 'Default Theme',
      version: '1.0.0',
      variables: {},
      components: {},
      animations: {},
    };
  }

  onChange(handler: (theme: ThemeDefinition) => void): Disposable {
    this.listeners.add(handler);
    return () => { this.listeners.delete(handler); };
  }

  setVariable(key: string, value: string): void {
    document.documentElement.style.setProperty(key, value);
  }
}

class I18nEngineImpl {
  private locale = 'en';
  private translations = new Map<string, Map<string, string>>();

  setLocale(locale: string): void {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale;
  }

  t(key: string, params?: Record<string, string>): string {
    const translations = this.translations.get(this.locale);
    let text = translations?.get(key) || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, v);
      });
    }
    
    return text;
  }

  registerTranslations(locale: string, translations: Record<string, string>): void {
    const map = new Map(Object.entries(translations));
    this.translations.set(locale, map);
  }
}

export function createCoreRuntime(): CoreRuntime {
  // Create infrastructure
  const eventBus = new EventBusImpl();
  const diContainer = new DIContainerImpl();
  const stateContainer = new StateContainerImpl();
  const routerManager = new RouterManagerImpl();
  const configStore = new ConfigStoreImpl();
  const themeEngine = new ThemeEngineImpl();
  const i18nEngine = new I18nEngineImpl();

  // Create runtime object
  const runtime: CoreRuntime = {
    plugin: null as unknown as PluginRegistry, // Will be set after creation
    event: eventBus,
    state: stateContainer,
    router: routerManager,
    di: diContainer,
    config: configStore,
    theme: themeEngine,
    i18n: i18nEngine,
  };

  // Create plugin registry with runtime reference
  runtime.plugin = new PluginRegistry(runtime);

  return runtime;
}

// Typed event bus for domain events
export function createTypedEventBus(runtime: CoreRuntime) {
  return new TypedEventBus<DomainEvents>(runtime.event);
}

// Global runtime instance (singleton for app)
let globalRuntime: CoreRuntime | null = null;

export function getRuntime(): CoreRuntime {
  if (!globalRuntime) {
    globalRuntime = createCoreRuntime();
  }
  return globalRuntime;
}

export function setRuntime(runtime: CoreRuntime): void {
  globalRuntime = runtime;
}
