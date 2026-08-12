import { NextResponse } from 'next/server';
import prisma from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email, module, createdAt } = body;

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check duplicate email
    const exists = await prisma.registeredUser.findUnique({
      where: { email }
    });
    
    if (exists) {
      return NextResponse.json({ ok: true, message: 'User already registered' });
    }

    const newUser = await prisma.registeredUser.create({
      data: {
        name,
        phone,
        email,
        module: module || 'Not selected',
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      }
    });

    return NextResponse.json({ ok: true, user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
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

  try {
    const users = await prisma.registeredUser.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching registered users:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const cookie = request.headers.get('cookie') || '';
  const hasSession = cookie.includes('admin_session=authenticated');
  const headerPass = request.headers.get('x-admin-password');
  const adminPasscode = process.env.ADMIN_PASSWORD || 'Ssrbs';

  if (!hasSession && headerPass !== adminPasscode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.registeredUser.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const cookie = request.headers.get('cookie') || '';
  const hasSession = cookie.includes('admin_session=authenticated');
  const headerPass = request.headers.get('x-admin-password');
  const adminPasscode = process.env.ADMIN_PASSWORD || 'Ssrbs';

  if (!hasSession && headerPass !== adminPasscode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const { isFollowedUp } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updatedUser = await prisma.registeredUser.update({
      where: { id },
      data: { isFollowedUp }
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
