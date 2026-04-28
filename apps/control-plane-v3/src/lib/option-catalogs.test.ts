import { describe, expect, it } from 'vitest';
import {
  AUTH_METHOD_OPTIONS,
  DEFAULT_AUTH_METHOD,
  SANDBOX_MODE_OPTIONS,
  THINKING_LEVEL_OPTIONS,
  allOptionCatalogs,
} from './option-catalogs';

describe('option catalogs', () => {
  it('keeps option values unique within every catalog', () => {
    for (const [catalogName, options] of Object.entries(allOptionCatalogs)) {
      const values = options.map((option) => option.value);

      expect(new Set(values).size, catalogName).toBe(values.length);
    }
  });

  it('uses openclaw_session as the default auth method', () => {
    expect(DEFAULT_AUTH_METHOD).toBe('openclaw_session');
    expect(AUTH_METHOD_OPTIONS[0]?.value).toBe('openclaw_session');
  });

  it('aligns agent runtime options with backend defaults', () => {
    expect(SANDBOX_MODE_OPTIONS.map((option) => option.value)).toContain('workspace-write');
    expect(THINKING_LEVEL_OPTIONS.map((option) => option.value)).toContain('balanced');
  });
});
