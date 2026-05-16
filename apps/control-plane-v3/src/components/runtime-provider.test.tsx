import { describe, expect, it } from 'vitest';
import { shouldUseRuntimeShell } from './runtime-provider';

describe('shouldUseRuntimeShell', () => {
  it('enables the browser runtime only for demo routes', () => {
    expect(shouldUseRuntimeShell('/demo')).toBe(true);
    expect(shouldUseRuntimeShell('/demo/identities')).toBe(true);
    expect(shouldUseRuntimeShell('/assets')).toBe(false);
    expect(shouldUseRuntimeShell('/tasks')).toBe(false);
    expect(shouldUseRuntimeShell('/docs')).toBe(false);
    expect(shouldUseRuntimeShell('/')).toBe(false);
  });
});
