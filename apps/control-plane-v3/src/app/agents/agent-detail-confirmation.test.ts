import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const agentsDir = path.dirname(fileURLToPath(import.meta.url));

async function readAgentDetailSource() {
  return readFile(path.join(agentsDir, '[agentId]/page.tsx'), 'utf8');
}

describe('Agent detail destructive action confirmation', () => {
  it('routes disable, rotate, and revoke through confirmation dialogs', async () => {
    const source = await readAgentDetailSource();

    expect(source).toContain('isOpen={confirmDisable}');
    expect(source).toContain("onConfirm={() => void changeAgentStatus('disabled')}");
    expect(source).toContain("onClick={() => setConfirmation('rotate')}");
    expect(source).toContain("onClick={() => setConfirmation('revoke')}");
    expect(source).toContain('isOpen={confirmation !== null}');
    expect(source).toContain(
      'onConfirm={() => confirmation && void executeTokenAction(confirmation)}'
    );
  });

  it('keeps destructive API calls inside confirmed action handlers', async () => {
    const source = await readAgentDetailSource();

    expect(source).toMatch(
      /async function changeAgentStatus[\s\S]*setAgentStatus\(params\.agentId, status\)/
    );
    expect(source).toMatch(
      /async function executeTokenAction[\s\S]*rotateToken\(agentId, token\.id\)/
    );
    expect(source).toMatch(
      /async function executeTokenAction[\s\S]*revokeToken\(agentId, token\.id\)/
    );
  });

  it('preserves unsaved grants while SWR revalidates', async () => {
    const source = await readAgentDetailSource();

    expect(source).toContain('const [selectionDirty, setSelectionDirty] = useState(false)');
    expect(source).toContain('if (!selectionDirty)');
    expect(source).toContain('setSelectionDirty(true)');
    expect(source).toContain('setSelectionDirty(false)');
  });
});
