import { describe, expect, it } from 'vitest';
import { parseTags } from './secret-types';

describe('parseTags', () => {
  it('normalizes commas, newlines, whitespace, and duplicates', () => {
    expect(parseTags(' production, database\nproduction，critical ')).toEqual([
      'production',
      'database',
      'critical',
    ]);
  });
});
