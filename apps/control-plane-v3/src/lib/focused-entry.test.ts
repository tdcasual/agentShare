import { describe, expect, it } from 'vitest';
import { readFocusedEntry } from './focused-entry';

describe('focused-entry', () => {
  it('reads task focus from search params', () => {
    const focus = readFocusedEntry(new URLSearchParams('taskId=task-1'));

    expect(focus.taskId).toBe('task-1');
  });

  it('reads shared resource focus fields', () => {
    const focus = readFocusedEntry(new URLSearchParams('resourceKind=capability&resourceId=capability-2'));

    expect(focus.resourceKind).toBe('capability');
    expect(focus.resourceId).toBe('capability-2');
  });

  it('reads identity and event focus fields', () => {
    const focus = readFocusedEntry(new URLSearchParams('agentId=bootstrap&eventId=event-1'));

    expect(focus.agentId).toBe('bootstrap');
    expect(focus.eventId).toBe('event-1');
  });
});
