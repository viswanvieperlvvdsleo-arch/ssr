import { NextResponse } from 'next/server';
import { readSessionValue, SESSION_COOKIE } from './app/api/ssr/sessionToken';

const OPEN_API_PATHS = new Set([
  '/api/ssr/auth',
  '/api/ssr/scheduled-tasks',
  '/api/ssr/payments/webhook',
  '/api/ssr/meeting-room/signal',
]);
const COMPANY_API_PATHS = new Set([
  '/api/ssr/company',
  '/api/ssr/company-users',
  '/api/ssr/company-feed',
  '/api/ssr/requirements',
  '/api/ssr/courses',
  '/api/ssr/payments/order',
  '/api/ssr/payments/verify',
  '/api/ssr/payments/history',
  '/api/ssr/payments/reconcile',
  '/api/ssr/server-credentials',
  '/api/ssr/company-server-access',
  '/api/ssr/push-tokens',
  '/api/ssr/notifications',
  '/api/ssr/chats',
  '/api/ssr/messages',
  '/api/ssr/posts',
  '/api/ssr/meetings',
  '/api/ssr/meetings/external-join',
  '/api/ssr/meeting-room/join',
]);

export function proxy(request) {
  const path = request.nextUrl.pathname;
  if (OPEN_API_PATHS.has(path)) return NextResponse.next();

  let session;
  try {
    session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    return NextResponse.json({ error: 'Session configuration is missing' }, { status: 503 });
  }

  if (path.startsWith('/api/ssr/')) {
    if (!session) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });
    if (session.companyId && !COMPANY_API_PATHS.has(path) && !path.startsWith('/api/ssr/company-profile-media/') && !path.startsWith('/api/ssr/company-chat-media/')) {
      return NextResponse.json({ error: 'This page is not available to company accounts' }, { status: 403 });
    }
  }
  if (path.startsWith('/ssr-app/') && !session) {
    return NextResponse.redirect(new URL('/ssr-app', request.url));
  }
  if (path.startsWith('/ssr-app/') && path !== '/ssr-app/company' && !path.startsWith('/ssr-app/meeting/') && session?.companyId) {
    return NextResponse.redirect(new URL('/ssr-app/company', request.url));
  }
  if (path === '/ssr-app/company' && (!session || !session.companyId)) {
    return NextResponse.redirect(new URL('/ssr-app', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/ssr/:path*', '/ssr-app/:path*'],
};
