import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy', () => {
  it('never interprets session cookies or emits authorization hints', () => {
    const request = new NextRequest('http://localhost/agents', {
      headers: { cookie: 'vaultgate_session=opaque-server-session' },
    });
    const response = proxy(request);

    expect(response.headers.get('x-auth-required')).toBeNull();
    expect(response.headers.get('x-current-role')).toBeNull();
    expect(response.headers.get('x-forbidden')).toBeNull();
  });
});
