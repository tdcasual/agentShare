'use client';


import type { CoreRuntime, RouteConfig, Disposable, ThemeDefinition, Plugin } from './plugin/types';
import { PluginRegistry } from './plugin';
import { EventBusImpl, TypedEventBus } from './event';
import { DIContainerImpl } from './di';
import { StateContainerImpl } from './state';
import type { DomainEvents } from '../shared/types';
import { logger } from '@/lib/logger';
import * as React from 'react';


class RouterManagerImpl {
  private routes: Map<string, RouteConfig> = new Map();

  register(route: RouteConfig): Disposable {
    this.routes.set(route.path, route);
    return () => {
      this.routes.delete(route.path);
    };
  }

  navigate(path: string): void {
    logger.runtime.debug(`Navigating to: ${path}`);
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
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
    this.subscribers.get(key)?.forEach((cb) => cb(value));
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
    return (
      this.themes.get(this.currentThemeId) ?? {
        id: 'default',
        name: 'Default Theme',
        version: '1.0.0',
        variables: {},
        components: {},
        animations: {},
      }
    );
  }

  onChange(handler: (theme: ThemeDefinition) => void): Disposable {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  setVariable(key: string, value: string): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(key, value);
    }
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


export interface RuntimeConfig {
  plugins?: Plugin[];
  initialLocale?: string;
}

export function createCoreRuntime(config: RuntimeConfig = {}): CoreRuntime {
  const eventBus = new EventBusImpl();
  const diContainer = new DIContainerImpl();
  const stateContainer = new StateContainerImpl();
  const routerManager = new RouterManagerImpl();
  const configStore = new ConfigStoreImpl();
  const themeEngine = new ThemeEngineImpl();
  const i18nEngine = new I18nEngineImpl();

  if (config.initialLocale) {
    i18nEngine.setLocale(config.initialLocale);
  }

  const runtime: CoreRuntime = {
    plugin: null as unknown as PluginRegistry,
    event: eventBus,
    state: stateContainer,
    router: routerManager,
    di: diContainer,
    config: configStore,
    theme: themeEngine,
    i18n: i18nEngine,
  };

  runtime.plugin = new PluginRegistry(runtime);

  if (config.plugins) {
    for (const plugin of config.plugins) {
      runtime.plugin.register(plugin);
    }
  }

  return runtime;
}

export async function initializeRuntime(
  runtime: CoreRuntime,
  pluginIds?: string[]
): Promise<CoreRuntime> {
  const pluginsToActivate = pluginIds ?? runtime.plugin.getAll().map((p) => p.id);

  for (const pluginId of pluginsToActivate) {
    if (!runtime.plugin.isActive(pluginId)) {
      await runtime.plugin.activatePlugin(pluginId);
    }
  }

  return runtime;
}


export const RuntimeContext = React.createContext<CoreRuntime | null>(null);

export function useRuntime(): CoreRuntime {
  const runtime = React.useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useRuntime must be used within RuntimeProvider');
  }
  return runtime;
}

export function useRuntimeOptional(): CoreRuntime | null {
  return React.useContext(RuntimeContext);
}


let globalRuntime: CoreRuntime | null = null;

/**
 * @deprecated 使用 RuntimeContext + useRuntime() 替代
 * 将在 v2.0 中移除
 */
export function getRuntime(): CoreRuntime {
  if (!globalRuntime) {
    globalRuntime = createCoreRuntime();
  }
  return globalRuntime;
}

/**
 * @deprecated 使用 createCoreRuntime({ plugins: [...] }) 替代
 * 将在 v2.0 中移除
 */
export function setRuntime(runtime: CoreRuntime): void {
  globalRuntime = runtime;
}

/**
 * @deprecated 使用 initializeRuntime(runtime, plugins) 替代
 * 将在 v2.0 中移除
 */
export async function initializeRuntimeLegacy(
  runtime: CoreRuntime = getRuntime()
): Promise<CoreRuntime> {
  const { IdentityDomainPlugin } = await import('../domains/identity/plugin');

  const identityPluginId = 'domain.identity';

  if (!runtime.plugin.get(identityPluginId)) {
    runtime.plugin.register(new IdentityDomainPlugin());
  }

  if (!runtime.plugin.isActive(identityPluginId)) {
    await runtime.plugin.activatePlugin(identityPluginId);
  }

  return runtime;
}

export function createTypedEventBus(runtime: CoreRuntime) {
  return new TypedEventBus<DomainEvents>(runtime.event);
}
