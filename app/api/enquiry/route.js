import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export async function GET() {
  try {
    const enquiries = await prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: enquiries });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message, type } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, Email, and Message are required' }, { status: 400 });
    }

    const newEnquiry = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        type: type || 'general'
      }
    });

    return NextResponse.json({ success: true, data: newEnquiry }, { status: 201 });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
