// ============================================
// Plugin System Implementation
// ============================================

import type { Plugin, PluginSystem, ExtensionPoint, CoreRuntime, Disposable } from './types';

export * from './types';

export class PluginRegistry implements PluginSystem {
  private plugins = new Map<string, Plugin>();
  private activePlugins = new Set<string>();
  private extensionPoints = new Map<string, ExtensionPointImpl<unknown>>();
  private runtime: CoreRuntime;

  constructor(runtime: CoreRuntime) {
    this.runtime = runtime;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${plugin.id} depends on ${dep} which is not registered`);
        }
      }
    }

    this.plugins.set(plugin.id, plugin);

    // Auto-install
    plugin.install(this.runtime);
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.activePlugins.has(pluginId)) {
      return;
    }

    // Activate dependencies first
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        await this.activatePlugin(dep);
      }
    }

    await plugin.activate();
    this.activePlugins.add(pluginId);
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Deactivate dependent plugins first
    for (const [id, p] of this.plugins) {
      if (p.dependencies?.includes(pluginId)) {
        await this.deactivatePlugin(id);
      }
    }

    if (this.activePlugins.has(pluginId)) {
      await plugin.deactivate();
      this.activePlugins.delete(pluginId);
    }
  }

  unregister(pluginId: string): void {
    this.deactivatePlugin(pluginId);
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.uninstall();
      this.plugins.delete(pluginId);
    }
  }

  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  extend<T>(pointId: string, contribution: T): Disposable {
    let point = this.extensionPoints.get(pointId);
    if (!point) {
      point = new ExtensionPointImpl<T>(pointId);
      this.extensionPoints.set(pointId, point);
    }
    return point.register(contribution as T);
  }

  getContributions<T>(pointId: string): T[] {
    const point = this.extensionPoints.get(pointId);
    return point ? (point.getContributions() as T[]) : [];
  }

  async activateAll(): Promise<void> {
    // Topological sort based on dependencies
    const sorted = this.topologicalSort();
    for (const pluginId of sorted) {
      await this.activatePlugin(pluginId);
    }
  }

  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (pluginId: string) => {
      if (temp.has(pluginId)) {
        throw new Error(`Circular dependency detected involving ${pluginId}`);
      }
      if (visited.has(pluginId)) {
        return;
      }

      temp.add(pluginId);
      const plugin = this.plugins.get(pluginId);
      if (plugin?.dependencies) {
        for (const dep of plugin.dependencies) {
          visit(dep);
        }
      }
      temp.delete(pluginId);
      visited.add(pluginId);
      result.push(pluginId);
    };

    for (const pluginId of this.plugins.keys()) {
      visit(pluginId);
    }

    return result;
  }
}

class ExtensionPointImpl<T> implements ExtensionPoint<T> {
  private contributions: T[] = [];
  private disposables = new Map<T, () => void>();

  constructor(public readonly id: string) {}

  register(contribution: T): Disposable {
    this.contributions.push(contribution);

    const dispose = () => {
      const index = this.contributions.indexOf(contribution);
      if (index > -1) {
        this.contributions.splice(index, 1);
      }
      this.disposables.delete(contribution);
    };

    this.disposables.set(contribution, dispose);
    return dispose;
  }

  getContributions(): T[] {
    return [...this.contributions];
  }
}
