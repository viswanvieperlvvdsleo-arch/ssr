import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const res = await fetch('http://localhost:3000/api/ssr/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: 'admin.ssrbs@gmail.com', password: 'Ssrbs@2020' })
    });
    const data = await res.json();
    return NextResponse.json({ status: res.status, data });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}
