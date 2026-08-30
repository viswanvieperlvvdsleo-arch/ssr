import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET(req) {
  try {
    const email = 'admin.ssrbs@gmail.com';
    const password = 'Ssrbs@2020';
    
    const user = await prisma.appUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found in DB at all!' });
    }
    
    if (user.password !== password) {
      return NextResponse.json({ error: 'Password mismatch!', dbPassword: user.password, providedPassword: password });
    }
    
    return NextResponse.json({ success: true, message: 'Login works locally!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
