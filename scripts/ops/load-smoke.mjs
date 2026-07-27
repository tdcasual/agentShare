#!/usr/bin/env node

const baseUrl = new URL(process.env.LOAD_BASE_URL ?? 'http://127.0.0.1:3000');
const requestCount = Number.parseInt(process.env.LOAD_REQUESTS ?? '100', 10);
const concurrency = Number.parseInt(process.env.LOAD_CONCURRENCY ?? '10', 10);
const timeoutMs = Number.parseInt(process.env.LOAD_TIMEOUT_MS ?? '5000', 10);
const p95BudgetMs = Number.parseInt(process.env.LOAD_P95_BUDGET_MS ?? '1000', 10);
const paths = ['/healthz', '/readyz'];

if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('LOAD_BASE_URL must use HTTP(S)');
if (!Number.isInteger(requestCount) || requestCount < 1) throw new Error('LOAD_REQUESTS must be positive');
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error('LOAD_CONCURRENCY must be between 1 and 100');
}

let nextRequest = 0;
const results = [];

async function worker() {
  while (nextRequest < requestCount) {
    const index = nextRequest;
    nextRequest += 1;
    const path = paths[index % paths.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    try {
      const response = await fetch(new URL(path, baseUrl), {
        cache: 'no-store',
        signal: controller.signal,
      });
      await response.arrayBuffer();
      results.push({ duration: performance.now() - startedAt, ok: response.status === 200, path });
    } catch {
      results.push({ duration: performance.now() - startedAt, ok: false, path });
    } finally {
      clearTimeout(timeout);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));

const durations = results.map((result) => result.duration).sort((left, right) => left - right);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.ceil(value * durations.length) - 1)];
const failures = results.filter((result) => !result.ok);
const report = {
  base_url: baseUrl.origin,
  concurrency,
  failures: failures.length,
  p50_ms: Number(percentile(0.5).toFixed(1)),
  p95_ms: Number(percentile(0.95).toFixed(1)),
  p99_ms: Number(percentile(0.99).toFixed(1)),
  requests: results.length,
};

console.log(JSON.stringify(report));
if (failures.length > 0 || report.p95_ms > p95BudgetMs) process.exitCode = 1;
