import assert from 'node:assert/strict';
import test from 'node:test';

import * as runtimeModule from './runtime';
import type { CoreRuntime } from './plugin/types';
import { IdentityDomainPlugin } from '../domains/identity/plugin';
import { IdentityRegistryServiceId } from '../domains/identity/services/identity-registry';

test('identity domain plugin registers and activates against a fresh runtime', async () => {
  const runtime = runtimeModule.createCoreRuntime();
  const plugin = new IdentityDomainPlugin();

  assert.doesNotThrow(() => {
    runtime.plugin.register(plugin);
  });

  await assert.doesNotReject(async () => {
    await runtime.plugin.activatePlugin(plugin.id);
  });

  const registry = runtime.di.resolve(IdentityRegistryServiceId);
  assert.equal(registry.getAll().length, 3);
  assert.equal(runtime.plugin.isActive(plugin.id), true);
});

test('runtime initialization is idempotent for repeated page mounts', async () => {
  const runtime = runtimeModule.createCoreRuntime();
  const initializeRuntime = (
    runtimeModule as typeof runtimeModule & {
      initializeRuntime?: (runtime: CoreRuntime) => Promise<CoreRuntime>;
    }
  ).initializeRuntime;

  assert.equal(typeof initializeRuntime, 'function');

  await assert.doesNotReject(async () => {
    await initializeRuntime!(runtime);
    await initializeRuntime!(runtime);
  });

  const registry = runtime.di.resolve(IdentityRegistryServiceId);
  assert.equal(runtime.plugin.isActive('domain.identity'), true);
  assert.equal(registry.getAll().length, 3);
});
