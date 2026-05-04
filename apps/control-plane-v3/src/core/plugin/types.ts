// ============================================
// Plugin System Types
// ============================================

import type { Disposable } from '../../shared/types';
export type { Disposable };

export interface Plugin {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: string[];

  install(runtime: CoreRuntime): void | Promise<void>;
  activate(): void | Promise<void>;
  deactivate(): void | Promise<void>;
  uninstall(): void | Promise<void>;
}

export interface CoreRuntime {
  plugin: PluginSystem;
  event: EventBus;
  state: StateContainer;
  router: RouterManager;
  di: DIContainer;
  config: ConfigStore;
  theme: ThemeEngine;
  i18n: I18nEngine;
}

export interface PluginSystem {
  register(plugin: Plugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): Plugin | undefined;
  getAll(): Plugin[];
  isActive(pluginId: string): boolean;
  activatePlugin(pluginId: string): Promise<void>;
  deactivatePlugin(pluginId: string): Promise<void>;

  extend<T>(pointId: string, contribution: T): Disposable;
  getContributions<T>(pointId: string): T[];
}

export interface ExtensionPoint<T = unknown> {
  readonly id: string;
  register(contribution: T): Disposable;
  getContributions(): T[];
}

export interface EventBus {
  emit<K extends string>(event: K, payload: unknown): void;
  on<K extends string>(event: K, handler: (payload: unknown) => void | Promise<void>): Disposable;
  once<K extends string>(event: K, handler: (payload: unknown) => void): Disposable;
  off<K extends string>(event: K, handler: (payload: unknown) => void): void;
}

export interface StateContainer {
  create<T>(name: string, initializer: StateInitializer<T>): Store<T>;
  get<T>(name: string): Store<T> | undefined;
  delete(name: string): void;
}

export type StateInitializer<T> = (set: SetState<T>, get: GetState<T>) => T;

export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;

export type GetState<T> = () => T;

export interface Store<T> {
  getState(): T;
  setState: SetState<T>;
  subscribe(listener: (state: T, prevState: T) => void): Disposable;
}

export interface RouterManager {
  register(route: RouteConfig): Disposable;
  navigate(path: string): void;
  getCurrentRoute(): RouteConfig | undefined;
}

export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  layout?: string;
  guards?: RouteGuard[];
}

export type RouteGuard = () => boolean | Promise<boolean>;

export interface DIContainer {
  register<T>(id: ServiceIdentifier<T>, implementation: Constructor<T> | T): void;
  resolve<T>(id: ServiceIdentifier<T>): T;
  resolveAsync<T>(id: ServiceIdentifier<T>): Promise<T>;
  createScope(): DIScope;
}

export interface DIScope {
  register<T>(id: ServiceIdentifier<T>, implementation: Constructor<T> | T): void;
  resolve<T>(id: ServiceIdentifier<T>): T;
  dispose(): void;
}

export interface ServiceIdentifier<T> {
  readonly symbol: symbol;
  readonly name: string;
  readonly __type?: T;
}

export type Constructor<T> = new (...args: unknown[]) => T;

export interface ConfigStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  subscribe<T>(key: string, handler: (value: T | undefined) => void): Disposable;
}

export interface ThemeEngine {
  register(theme: ThemeDefinition): void;
  activate(themeId: string): Promise<void>;
  getCurrent(): ThemeDefinition;
  onChange(handler: (theme: ThemeDefinition) => void): Disposable;
  setVariable(key: string, value: string): void;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  version: string;
  variables: Record<string, string>;
  components: ComponentVariants;
  animations: AnimationDefinitions;
}

export interface ComponentVariants {
  [componentName: string]: {
    base?: string;
    variants?: Record<string, string>;
    sizes?: Record<string, string>;
    states?: Record<string, string>;
    types?: Record<string, string>;
  };
}

export interface AnimationDefinitions {
  [animationName: string]: {
    keyframes: Record<string, unknown>;
    duration: string;
    easing?: string;
    fillMode?: string;
  };
}

export interface I18nEngine {
  setLocale(locale: string): void;
  getLocale(): string;
  t(key: string, params?: Record<string, string>): string;
  registerTranslations(locale: string, translations: Record<string, string>): void;
}

// Extension Point IDs
export const ExtensionPoints = {
  ROUTES: 'core.routes',
  MENUS: 'core.menus',
  COMPONENTS: 'core.components',
  PERMISSIONS: 'core.permissions',
  SETTINGS: 'core.settings',
  THEMES: 'core.themes',
  KEYBINDINGS: 'core.keybindings',
  ICONS: 'core.icons',
} as const;

// Service Identifiers
export function createServiceIdentifier<T>(name: string): ServiceIdentifier<T> {
  return {
    symbol: Symbol.for(name),
    name,
  };
}
