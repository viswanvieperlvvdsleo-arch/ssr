import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || 'Contact Form Submission',
        message
      }
    });

    return NextResponse.json({ success: true, data: contactMessage }, { status: 201 });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit contact form.' }, { status: 500 });
  }
}
