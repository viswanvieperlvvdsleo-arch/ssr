import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Expire the cookie immediately
  response.headers.append(
    'Set-Cookie',
    'admin_session=deleted; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return response;
}
