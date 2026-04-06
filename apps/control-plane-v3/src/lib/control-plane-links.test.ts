import { describe, expect, it } from 'vitest';
import {
  buildAssetHref,
  buildIdentityHref,
  buildReviewHref,
  buildSpaceHref,
  buildTaskHref,
  deriveEventHref,
} from './control-plane-links';

describe('control-plane-links', () => {
  it('builds focused identity hrefs for agents', () => {
    expect(buildIdentityHref({ agentId: 'agent-1' })).toBe('/identities?agentId=agent-1');
  });

  it('builds focused task hrefs', () => {
    expect(buildTaskHref('task-7')).toBe('/tasks?taskId=task-7');
  });

  it('builds focused asset hrefs', () => {
    expect(buildAssetHref('secret', 'secret-2')).toBe(
      '/assets?resourceKind=secret&resourceId=secret-2'
    );
    expect(buildAssetHref('capability', 'capability-3')).toBe(
      '/assets?resourceKind=capability&resourceId=capability-3'
    );
  });

  it('builds focused review and space hrefs', () => {
    expect(buildReviewHref('task', 'task-9')).toBe('/reviews?resourceKind=task&resourceId=task-9');
    expect(buildSpaceHref({ agentId: 'agent-4', eventId: 'event-8' })).toBe(
      '/spaces?agentId=agent-4&eventId=event-8'
    );
  });

  it('preserves explicit focused event hrefs', () => {
    expect(
      deriveEventHref({
        actionUrl: '/tasks?taskId=task-12',
        subjectType: 'task',
        subjectId: 'task-12',
      })
    ).toBe('/tasks?taskId=task-12');
  });

  it('derives focused event hrefs from subject and metadata when generic routes are provided', () => {
    expect(
      deriveEventHref({
        actionUrl: '/tasks',
        subjectType: 'task_target',
        subjectId: 'target-1',
        metadata: { task_id: 'task-18' },
      })
    ).toBe('/tasks?taskId=task-18');
  });
});
