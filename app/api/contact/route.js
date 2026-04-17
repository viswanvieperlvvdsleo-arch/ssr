import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const name = normalizeRequiredText(payload?.name);
    const email = normalizeRequiredText(payload?.email);
    const phone = normalizeOptionalText(payload?.phone);
    const subject = normalizeRequiredText(payload?.subject);
    const message = normalizeRequiredText(payload?.message);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Please fill in your name, email, subject, and message.' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const contactId = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "ContactMessage" ("id", "name", "email", "phone", "subject", "message", "createdAt")
      VALUES (${contactId}, ${name}, ${email}, ${phone}, ${subject}, ${message}, CURRENT_TIMESTAMP)
    `;

    return NextResponse.json({
      ok: true,
      message: 'Your message has been saved successfully. Our team will contact you soon.',
      contactId
    });
  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'We could not save your message right now. Please try again.' },
      { status: 500 }
    );
  }
}
