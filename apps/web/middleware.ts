import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_API_URL = 'http://localhost:4000';

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}

function clientIp(request: NextRequest) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for') ||
    ''
  );
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const ip = clientIp(request);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': request.headers.get('user-agent') || '',
    };
    const trapSecret = process.env.ADMIN_TRAP_SECRET || '';

    if (ip) headers['x-forwarded-for'] = ip;
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) headers['cf-connecting-ip'] = cfIp;
    if (trapSecret) headers['x-admin-trap-secret'] = trapSecret;

    try {
      await fetch(`${apiBaseUrl()}/security/admin-trap`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: request.nextUrl.pathname }),
      });
    } catch {
      // The trap must never break the public 404 response.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
