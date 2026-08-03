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
  const sharedSpace = await api.post('/api/admin/spaces', {
    data: { name: 'Synthetic Shared Space', description: 'HTTP collaboration verification' },
  });
  expect(sharedSpace.status()).toBe(201);
  const sharedSpaceId = (await sharedSpace.json()).id as string;
  const memberships = await api.put(`/api/admin/spaces/${sharedSpaceId}/memberships`, {
    data: {
      members: [
        { token_id: tokenIds[0], role: 'contributor', status: 'active' },
        { token_id: tokenIds[1], role: 'reader', status: 'active' },
      ],
    },
  });
  expect(memberships.ok()).toBeTruthy();

  const writeDurations: number[] = [];
  const writeStatuses = await Promise.all(
    Array.from({ length: 30 }, async (_, index) => {
      const startedAt = performance.now();
      const response = await runtimeA.post(`/api/vault/spaces/${sharedSpaceId}/secrets`, {
        headers: { 'Idempotency-Key': `synthetic-load-${String(index).padStart(3, '0')}` },
        data: {
          name: `Synthetic Load ${String(index).padStart(3, '0')}`,
          type: 'api_key',
          value: `load-value-${index}`,
        },
      });
      writeDurations.push(performance.now() - startedAt);
      return response.status();
    })
  );
  expect(writeStatuses).toEqual(Array.from({ length: 30 }, () => 201));
  writeDurations.sort((left, right) => left - right);
  const writeP95 = writeDurations[Math.ceil(writeDurations.length * 0.95) - 1];
  expect(writeP95).toBeLessThan(2_000);

  const runtimeB = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Authorization: `Bearer ${runtimeTokens[1]}` },
  });
  const spaces = await runtimeB.get('/api/vault/spaces');
  expect(spaces.ok()).toBeTruthy();
  expect((await spaces.json()).items).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: sharedSpaceId, role: 'reader' })])
  );
  const contributed = await runtimeA.post(`/api/vault/spaces/${sharedSpaceId}/secrets`, {
    headers: { 'Idempotency-Key': 'synthetic-shared-secret' },
    data: { name: 'Synthetic Shared', type: 'password', value: 'shared-value' },
  });
  expect(contributed.status(), await contributed.text()).toBe(201);
  const sharedSecret = await contributed.json();
  expect(sharedSecret).toMatchObject({ space_id: sharedSpaceId, version: 1 });
  expect(sharedSecret.value).toBeUndefined();
  const readerList = await runtimeB.get(`/api/vault/secrets?space_id=${sharedSpaceId}`);
  expect(readerList.ok()).toBeTruthy();
  expect((await readerList.json()).items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: sharedSecret.id, permissions: ['read'] }),
    ])
  );
  const readerWrite = await runtimeB.patch(`/api/vault/secrets/${sharedSecret.id}`, {
    headers: { 'If-Match': '1' },
    data: { value: 'must-be-denied' },
  });
  expect(readerWrite.status()).toBe(403);
  const contributorUpdate = await runtimeA.patch(`/api/vault/secrets/${sharedSecret.id}`, {
    headers: { 'If-Match': '1' },
    data: { value: 'updated-shared-value' },
  });
  expect(contributorUpdate.ok()).toBeTruthy();
  expect((await contributorUpdate.json()).version).toBe(2);
  const staleUpdate = await runtimeA.patch(`/api/vault/secrets/${sharedSecret.id}`, {
    headers: { 'If-Match': '1' },
    data: { description: 'stale' },
  });
  expect(staleUpdate.status()).toBe(409);
  const sharedValue = await runtimeB.get(`/api/vault/secrets/${sharedSecret.id}/value`);
  expect((await sharedValue.json()).value).toBe('updated-shared-value');
  await runtimeB.dispose();
  const outsiderAgent = await api.post('/api/admin/agents', {
    headers: { 'Idempotency-Key': 'synthetic-outsider-agent' },
    data: { name: 'Synthetic Outsider' },
  });
  expect(outsiderAgent.status()).toBe(201);
  const outsiderToken = await api.post(
    `/api/admin/agents/${(await outsiderAgent.json()).id}/tokens`,
    { data: { name: 'Synthetic Outsider Token', ttl_seconds: 3600 } }
  );
  expect(outsiderToken.status()).toBe(201);
  const outsiderRuntime = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Authorization: `Bearer ${(await outsiderToken.json()).token}` },
  });
  const outsiderList = await outsiderRuntime.get('/api/vault/secrets');
  expect(outsiderList.ok()).toBeTruthy();
  expect((await outsiderList.json()).total).toBe(0);
  await outsiderRuntime.dispose();
  const visible = await runtimeA.get('/api/vault/secrets');
  expect(visible.ok()).toBeTruthy();
  expect((await visible.json()).items.map((item: { id: string }) => item.id)).toEqual(
    expect.arrayContaining([secretIds[0], sharedSecret.id])
  );
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
