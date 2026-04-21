import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(appDir, '..');

async function readSource(relativePath: string) {
  return readFile(path.join(srcDir, relativePath), 'utf8');
}

describe('Composite Hooks Safety', () => {
  it('identity composite hooks do not call hooks inside array loops', async () => {
    const source = await readSource('domains/identity/hooks.ts');

    expect(source).not.toMatch(/map\(agentId\s*=>\s*[\s\S]*useAccessTokens\(/);
    expect(source).not.toMatch(/map\(async\s*\(agentId\)\s*=>\s*[\s\S]*getAccessTokens\(/);
  });

  it('task dashboard hooks do not call hooks inside array loops', async () => {
    const source = await readSource('domains/task/hooks-dashboard.ts');

    expect(source).not.toMatch(/map\(agentId\s*=>\s*[\s\S]*useSWR(?:<[\s\S]*?>)?\(/);
    expect(source).not.toMatch(/map\(tokenId\s*=>\s*[\s\S]*useSWR(?:<[\s\S]*?>)?\(/);
    expect(source).not.toMatch(/map\(\(tokenId\)\s*=>\s*identityApi\.getAccessTokens\(/);
    expect(source).not.toMatch(/map\(\(tokenId\)\s*=>\s*taskApi\.getAccessTokenFeedback\(/);
    expect(source).not.toMatch(/runs\.find\(/);
    expect(source).not.toMatch(/item\.task_target_id\s*\?\?\s*item\.targetId/);
    expect(source).not.toMatch(/task\.target_access_token_ids\s*\?\?\s*\[\]/);
  });
});
