import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory store (resets on server restart — will add DB later)
let registeredUsers = [];

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email, module, createdAt } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check duplicate email
    const exists = registeredUsers.find(u => u.email === email);
    if (exists) {
      return NextResponse.json({ ok: true, message: 'User already registered' });
    }

    const newUser = {
      id: Date.now(),
      sno: registeredUsers.length + 1,
      name,
      phone,
      email,
      module: module || 'Not selected',
      createdAt: createdAt || new Date().toISOString(),
    };

    registeredUsers.push(newUser);
    return NextResponse.json({ ok: true, user: newUser });
  } catch (error) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

export async function GET(request) {
  // Check admin auth via cookie
  const cookie = request.headers.get('cookie') || '';
  const hasSession = cookie.includes('admin_session=authenticated');
  const headerPass = request.headers.get('x-admin-password');
  const adminPasscode = process.env.ADMIN_PASSWORD || 'Ssrbs';

  if (!hasSession && headerPass !== adminPasscode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ users: registeredUsers });
}
