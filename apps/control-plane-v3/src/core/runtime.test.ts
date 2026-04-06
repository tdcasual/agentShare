import { describe, it, expect } from 'vitest';
import * as runtimeModule from './runtime';
import type { CoreRuntime } from './plugin/types';
import { IdentityDomainPlugin } from '../domains/identity/plugin';
import { IdentityRegistryServiceId } from '../domains/identity/services/identity-registry';

describe('Runtime', () => {
  it('identity domain plugin registers and activates against a fresh runtime', async () => {
    const runtime = runtimeModule.createCoreRuntime();
    const plugin = new IdentityDomainPlugin();

    expect(() => {
      runtime.plugin.register(plugin);
    }).not.toThrow();

    await expect(runtime.plugin.activatePlugin(plugin.id)).resolves.not.toThrow();

    const registry = runtime.di.resolve(IdentityRegistryServiceId);
    expect(registry.getAll()).toHaveLength(3);
    expect(runtime.plugin.isActive(plugin.id)).toBe(true);
  });

  it('runtime initialization is idempotent for repeated page mounts', async () => {
    const runtime = runtimeModule.createCoreRuntime();
    const plugin = new IdentityDomainPlugin();

    // 先注册插件（initializeRuntime 需要 identity 服务）
    runtime.plugin.register(plugin);

    const initializeRuntime = (
      runtimeModule as typeof runtimeModule & {
        initializeRuntime?: (runtime: CoreRuntime) => Promise<CoreRuntime>;
      }
    ).initializeRuntime;

    expect(typeof initializeRuntime).toBe('function');

    // 第一次初始化
    await expect(initializeRuntime!(runtime)).resolves.not.toThrow();

    // 第二次初始化应该是幂等的（不重复注册/激活）
    await expect(initializeRuntime!(runtime)).resolves.not.toThrow();

    const registry = runtime.di.resolve(IdentityRegistryServiceId);
    expect(runtime.plugin.isActive('domain.identity')).toBe(true);
    expect(registry.getAll()).toHaveLength(3);
  });
});
