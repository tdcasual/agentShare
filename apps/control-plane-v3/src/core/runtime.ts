// ============================================
// Core Runtime - Composition Root
// ============================================
// 重构版本：解决 Core 层反向依赖 Domain 层的问题
// 同时保持向后兼容

import type { CoreRuntime, RouteConfig, Disposable, ThemeDefinition, Plugin } from './plugin/types';
import { PluginRegistry } from './plugin';
import { EventBusImpl, TypedEventBus } from './event';
import { DIContainerImpl } from './di';
import { StateContainerImpl } from './state';
import type { DomainEvents } from '../shared/types';
import * as React from 'react';

// ============================================
// 基础设施实现
// ============================================

class RouterManagerImpl {
  private routes: Map<string, RouteConfig> = new Map();
  
  register(route: RouteConfig): Disposable {
    this.routes.set(route.path, route);
    return () => { this.routes.delete(route.path); };
  }
  
  navigate(path: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Navigating to: ${path}`);
    }
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

// ============================================
// 重构后的 Runtime Factory（新增）
// ============================================

export interface RuntimeConfig {
  plugins?: Plugin[];
  initialLocale?: string;
}

export function createCoreRuntime(config: RuntimeConfig = {}): CoreRuntime {
  // 创建基础设施
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

  // 创建运行时对象
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

  // 创建插件注册表
  runtime.plugin = new PluginRegistry(runtime);

  // 注册初始插件（由调用方传入，而非硬编码）
  if (config.plugins) {
    for (const plugin of config.plugins) {
      runtime.plugin.register(plugin);
    }
  }

  return runtime;
}

// 初始化函数改为接收运行时实例和可选的插件ID列表
export async function initializeRuntime(
  runtime: CoreRuntime,
  pluginIds?: string[]
): Promise<CoreRuntime> {
  const pluginsToActivate = pluginIds ?? runtime.plugin.getAll().map(p => p.id);
  
  for (const pluginId of pluginsToActivate) {
    if (!runtime.plugin.isActive(pluginId)) {
      await runtime.plugin.activatePlugin(pluginId);
    }
  }

  return runtime;
}

// ============================================
// React Context（新增 - 替代全局单例）
// ============================================

export const RuntimeContext = React.createContext<CoreRuntime | null>(null);

export function useRuntime(): CoreRuntime {
  const runtime = React.useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useRuntime must be used within RuntimeProvider');
  }
  return runtime;
}

// 用于测试的 Hook，允许可选的 Runtime
export function useRuntimeOptional(): CoreRuntime | null {
  return React.useContext(RuntimeContext);
}

// ============================================
// 向后兼容的全局单例（标记为 deprecated）
// ============================================

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

// 向后兼容的初始化函数（自动注册 Identity 插件）
/**
 * @deprecated 使用 initializeRuntime(runtime, plugins) 替代
 * 将在 v2.0 中移除
 */
export async function initializeRuntimeLegacy(runtime: CoreRuntime = getRuntime()): Promise<CoreRuntime> {
  // 动态导入以避免循环依赖
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

// Typed event bus for domain events
export function createTypedEventBus(runtime: CoreRuntime) {
  return new TypedEventBus<DomainEvents>(runtime.event);
}
