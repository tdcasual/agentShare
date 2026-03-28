import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUpstreamBaseUrl() {
  return process.env.AGENT_CONTROL_PLANE_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

function resolveUpstreamPath(pathSegments: string[], method: string): string | null {
  const [scope, id, action] = pathSegments;

  if (scope === "tasks") {
    if (method === "GET" && pathSegments.length === 1) {
      return "/api/tasks";
    }
    if (method === "POST" && id && action === "claim" && pathSegments.length === 3) {
      return `/api/tasks/${encodeURIComponent(id)}/claim`;
    }
    if (method === "POST" && id && action === "complete" && pathSegments.length === 3) {
      return `/api/tasks/${encodeURIComponent(id)}/complete`;
    }
  }

  if (scope === "agents" && method === "GET" && id === "me" && pathSegments.length === 2) {
    return "/api/agents/me";
  }

  if (scope === "capabilities") {
    if (method === "POST" && id && action === "invoke" && pathSegments.length === 3) {
      return `/api/capabilities/${encodeURIComponent(id)}/invoke`;
    }
    if (method === "POST" && id && action === "lease" && pathSegments.length === 3) {
      return `/api/capabilities/${encodeURIComponent(id)}/lease`;
    }
  }

  if (scope === "mcp" && method === "POST" && pathSegments.length === 1) {
    return "/mcp";
  }

  if (scope === "healthz" && method === "GET" && pathSegments.length === 1) {
    return "/healthz";
  }

  // Explicit allowlist only; no generic proxying.
  return null;
}

async function proxyToUpstream(req: NextRequest, upstreamPath: string) {
  const baseUrl = getUpstreamBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: "AGENT_CONTROL_PLANE_API_URL is not configured." },
      { status: 503 },
    );
  }

  const upstreamUrl = new URL(upstreamPath, baseUrl);
  const headers = new Headers();
  headers.set("accept", "application/json");

  const auth = req.headers.get("authorization");
  if (auth) {
    headers.set("authorization", auth);
  }

  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const response = await fetch(upstreamUrl, init);
  const responseContentType = response.headers.get("content-type") ?? "text/plain";
  const bodyText = await response.text();

  if (responseContentType.includes("application/json")) {
    try {
      const payload = bodyText ? JSON.parse(bodyText) : null;
      return NextResponse.json(payload, { status: response.status });
    } catch {
      // Fall through to raw response if upstream lied about content-type.
    }
  }

  return new NextResponse(bodyText, {
    status: response.status,
    headers: { "content-type": responseContentType },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const upstreamPath = resolveUpstreamPath(path, "GET");
  if (!upstreamPath) {
    return NextResponse.json({ error: "Unsupported agent self-serve route." }, { status: 404 });
  }
  return proxyToUpstream(req, upstreamPath);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const upstreamPath = resolveUpstreamPath(path, "POST");
  if (!upstreamPath) {
    return NextResponse.json({ error: "Unsupported agent self-serve route." }, { status: 404 });
  }
  return proxyToUpstream(req, upstreamPath);
}
