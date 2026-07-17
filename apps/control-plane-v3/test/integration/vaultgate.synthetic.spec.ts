import { expect, request as playwrightRequest, test } from '@playwright/test';

test('completes the real VaultGate credential lifecycle', async () => {
  const origin = process.env.VAULTGATE_SYNTHETIC_BASE_URL ?? 'http://127.0.0.1:3000';
  const api = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const email = 'synthetic@example.com';
  const password = 'Synthetic!Admin#2026';

  const status = await api.get('/api/admin/bootstrap/status');
  expect(status.ok()).toBeTruthy();
  if ((await status.json()).setup_required) {
    const bootstrap = await api.post('/api/admin/bootstrap/init', {
      data: { email, password },
    });
    expect(bootstrap.status()).toBe(201);
  }

  const login = await api.post('/api/admin/session/login', { data: { email, password } });
  expect(login.ok()).toBeTruthy();

  const management = await api.post('/api/admin/management-tokens', {
    headers: { 'Idempotency-Key': 'synthetic-management-token' },
    data: {
      name: 'Synthetic Automation',
      description: 'Cross-service management credential check',
      ttl_seconds: 3600,
    },
  });
  expect(management.status()).toBe(201);
  expect(management.headers()['cache-control']).toBe('no-store');
  const managementPayload = await management.json();
  const managementId = managementPayload.id as string;
  const managementClient = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Authorization: `Bearer ${managementPayload.token}` },
  });
  expect((await managementClient.get('/api/admin/session')).ok()).toBeTruthy();
  const managementList = await api.get('/api/admin/management-tokens');
  const listedManagementToken = (await managementList.json()).items.find(
    (item: { id: string }) => item.id === managementId
  );
  expect(listedManagementToken).toMatchObject({
    description: 'Cross-service management credential check',
  });
  expect(listedManagementToken.created_at).toBeTruthy();
  expect(listedManagementToken.expires_at).toBeTruthy();

  const rotatedManagement = await api.post(`/api/admin/management-tokens/${managementId}/rotate`);
  expect(rotatedManagement.ok()).toBeTruthy();
  expect((await managementClient.get('/api/admin/session')).status()).toBe(401);
  const rotatedManagementClient = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Authorization: `Bearer ${(await rotatedManagement.json()).token}` },
  });
  expect((await rotatedManagementClient.get('/api/admin/session')).ok()).toBeTruthy();
  expect((await api.delete(`/api/admin/management-tokens/${managementId}`)).status()).toBe(204);
  expect((await rotatedManagementClient.get('/api/admin/session')).status()).toBe(401);
  await managementClient.dispose();
  await rotatedManagementClient.dispose();

  const secretIds: string[] = [];
  for (const [name, value] of [
    ['Synthetic A', 'value-a'],
    ['Synthetic B', 'value-b'],
  ] as const) {
    const response = await api.post('/api/admin/secrets', {
      headers: { 'Idempotency-Key': `synthetic-secret-${name.slice(-1).toLowerCase()}` },
      data: { name, type: 'password', value },
    });
    expect(response.status()).toBe(201);
    secretIds.push((await response.json()).id);
  }

  const agent = await api.post('/api/admin/agents', {
    headers: { 'Idempotency-Key': 'synthetic-agent' },
    data: { name: 'Synthetic Agent' },
  });
  expect(agent.status()).toBe(201);
  const agentId = (await agent.json()).id as string;

  const runtimeTokens: string[] = [];
  const tokenIds: string[] = [];
  for (const name of ['Synthetic Token A', 'Synthetic Token B']) {
    const response = await api.post(`/api/admin/agents/${agentId}/tokens`, {
      headers: { 'Idempotency-Key': `synthetic-${name.slice(-1).toLowerCase()}` },
      data: { name, ttl_seconds: 3600 },
    });
    expect(response.status()).toBe(201);
    const payload = await response.json();
    tokenIds.push(payload.id);
    runtimeTokens.push(payload.token);
  }

  for (let index = 0; index < tokenIds.length; index += 1) {
    const grants = await api.put(`/api/admin/tokens/${tokenIds[index]}/grants`, {
      data: { secret_ids: [secretIds[index]] },
    });
    expect(grants.ok()).toBeTruthy();
  }

  const runtimeA = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Authorization: `Bearer ${runtimeTokens[0]}` },
  });
  const visible = await runtimeA.get('/api/vault/secrets');
  expect(visible.ok()).toBeTruthy();
  expect((await visible.json()).items.map((item: { id: string }) => item.id)).toEqual([
    secretIds[0],
  ]);
  expect((await runtimeA.get(`/api/vault/secrets/${secretIds[1]}/value`)).status()).toBe(403);
  const revealed = await runtimeA.get(`/api/vault/secrets/${secretIds[0]}/value`);
  expect(revealed.ok()).toBeTruthy();
  expect((await revealed.json()).value).toBe('value-a');

  const audit = await api.get('/api/admin/audit-logs?limit=200');
  expect(audit.ok()).toBeTruthy();
  expect(
    (await audit.json()).items.some((item: { result: string }) => item.result === 'denied')
  ).toBeTruthy();

  expect((await api.delete(`/api/admin/tokens/${tokenIds[0]}`)).status()).toBe(204);
  expect((await runtimeA.get('/api/vault/me')).status()).toBe(401);

  await runtimeA.dispose();
  await api.dispose();
});
