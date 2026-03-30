/**
 * 重构后的 Runtime - 解决反向依赖问题
 * 
 * 关键改动:
 * 1. Core 层不再硬编码 Domain 插件
 * 2. 通过参数注入插件
 * 3. 移除全局单例，支持多实例
 */

import type { CoreRuntime, RouteConfig, Disposable, ThemeDefinition, Plugin } from './plugin/types';
import { PluginRegistry } from './plugin';
import { EventBusImpl, TypedEventBus } from './event';
import { DIContainerImpl } from './di';
import { StateContainerImpl } from './state';
import type { DomainEvents } from '../shared/types';

// 基础设施实现（保持不变）
class RouterManagerImpl {
  private routes: Map<string, RouteConfig> = new Map();
  
  register(route: RouteConfig): Disposable {
    this.routes.set(route.path, route);
    return () => { this.routes.delete(route.path); };
  }
  
  navigate(path: string): void {
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
// 重构后的 Runtime Factory
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

// 初始化函数也改为接收插件列表
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
// React Context 提供方式（替代全局单例）
// ============================================

import * as React from 'react';
const { createContext, useContext } = React;

export const RuntimeContext = createContext<CoreRuntime | null>(null);

export function useRuntime(): CoreRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useRuntime must be used within RuntimeProvider');
  }
  return runtime;
}

// 用于测试的 Hook，允许可选的 Runtime
export function useRuntimeOptional(): CoreRuntime | null {
  return useContext(RuntimeContext);
}

// ============================================
// 保留原有导出以兼容（标记为 deprecated）
// ============================================

let globalRuntime: CoreRuntime | null = null;

/**
 * @deprecated 使用 RuntimeContext + useRuntime() 替代
 */
export function getRuntime(): CoreRuntime {
  if (!globalRuntime) {
    globalRuntime = createCoreRuntime();
  }
  return globalRuntime;
}

/**
 * @deprecated 使用 createCoreRuntime({ plugins: [...] }) 替代
 */
export function setRuntime(runtime: CoreRuntime): void {
  globalRuntime = runtime;
}

// Typed event bus for domain events
export function createTypedEventBus(runtime: CoreRuntime) {
  return new TypedEventBus<DomainEvents>(runtime.event);
}
