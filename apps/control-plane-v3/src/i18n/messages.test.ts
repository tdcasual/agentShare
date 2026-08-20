import { describe, expect, it } from 'vitest';
import en from '@/i18n/messages/en.json';
import zhCN from '@/i18n/messages/zh-CN.json';

type MessageTree = { [key: string]: string | MessageTree };

function flatten(tree: MessageTree, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      leaves.set(path, value);
    } else {
      for (const [nestedKey, nestedValue] of flatten(value, path)) {
        leaves.set(nestedKey, nestedValue);
      }
    }
  }
  return leaves;
}

const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('i18n message parity', () => {
  const zh = flatten(zhCN as MessageTree);
  const english = flatten(en as MessageTree);

  it('zh-CN and en expose identical key trees', () => {
    expect([...zh.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('has no empty values in either locale', () => {
    for (const [key, value] of [...zh, ...english]) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('keeps interpolation placeholders aligned across locales', () => {
    for (const [key, value] of zh) {
      const counterpart = english.get(key);
      // Missing keys are reported by the key-tree test above; keep this
      // assertion focused on placeholder mismatches.
      if (counterpart === undefined) {
        continue;
      }
      expect(placeholders(value), key).toEqual(placeholders(counterpart));
    }
  });
});
