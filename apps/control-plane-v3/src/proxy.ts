import { NextResponse, type NextRequest } from 'next/server';

const sonnerStyleHashes = [
  "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
  "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='",
];

export function buildContentSecurityPolicy(
  nonce: string,
  development = false,
  upgradeInsecureRequests = !development
): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (development) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'nonce-${nonce}' ${sonnerStyleHashes.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(upgradeInsecureRequests ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const development = process.env.NODE_ENV !== 'production';
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const secureRequest = request.nextUrl.protocol === 'https:' || forwardedProtocol === 'https';
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    development,
    !development && secureRequest
  );
  const requestHeaders = new Headers(request.headers);

  // Next.js reads the request CSP to nonce its framework scripts. x-nonce is
  // also consumed by next-themes for its early theme initialization script.
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)'],
};
