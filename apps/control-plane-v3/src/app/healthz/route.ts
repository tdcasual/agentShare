/**
 * /healthz — liveness passthrough to the API (see upstream-health-probe.ts).
 */

import { NextResponse } from 'next/server';
import { proxyHealthCheck } from '@/lib/upstream-health-probe';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return proxyHealthCheck('/healthz');
}
