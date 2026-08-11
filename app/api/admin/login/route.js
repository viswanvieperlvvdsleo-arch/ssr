import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { passcode } = await request.json();
    const adminPasscode = process.env.ADMIN_PASSWORD || 'Ssrbs';

    if (passcode !== adminPasscode) {
      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    
    // Set a secure, HTTP-only cookie
    // HttpOnly makes it inaccessible to client-side JS (XSS protection)
    // SameSite=Strict prevents CSRF attacks
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
    response.headers.append(
      'Set-Cookie',
      `admin_session=authenticated; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400; ${secureFlag}`
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
