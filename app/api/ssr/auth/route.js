import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildChatData, buildMessageData, buildUserData, normalizeRole } from '../defaults';
import { attachSession, getSessionActor, publicAccount, SESSION_COOKIE } from '../session';
import { hashPassword, verifyPassword } from '../passwords';

export async function GET(request) {
  const actor = await getSessionActor(request);
  if (!actor) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  return NextResponse.json({ user: publicAccount(actor) });
}

export async function POST(req) {
  try {
    const { action, email, password, name, role, category, ...extraData } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    if (action === 'deleteAccount') {
      const user = await prisma.appUser.findUnique({ where: { email: normalizedEmail } });
      if (!user || !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }
      await prisma.appUser.delete({ where: { id: user.id } });
      const response = NextResponse.json({ success: true });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    if (action === 'login') {
      const user = await prisma.appUser.findUnique({ where: { email: normalizedEmail } });
      if (!user || !verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      if (user.restricted) return NextResponse.json({ error: 'This account is restricted' }, { status: 403 });
      if (category) {
        const requestedRole = normalizeRole(category);
        if (user.role !== 'Super Admin' && requestedRole !== user.role) {
          return NextResponse.json({
            error: `This account is registered as ${user.role}. Please choose ${user.role} and try again.`,
          }, { status: 403 });
        }
      }
      if (!user.password.startsWith('scrypt-v1$')) {
        await prisma.appUser.update({ where: { id: user.id }, data: { password: hashPassword(password) } });
      }
      return attachSession(NextResponse.json({ user: publicAccount(user) }), user);
    }

    if (action === 'signup') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || String(password || '').length < 6 || !name) {
        return NextResponse.json({ error: 'Enter a valid email, name, and password of at least 6 characters' }, { status: 400 });
      }
      const existingUser = await prisma.appUser.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }

      // Check if this is the very first user in the system
      const totalUsersCount = await prisma.appUser.count();
      const isFirstUser = totalUsersCount === 0;

      // Map User -> Participant. First user gets Super Admin automatically.
      let assignedRole = normalizeRole(category || role);
      if (isFirstUser) {
        assignedRole = 'Super Admin';
      } else if (!['Participant', 'Trainer'].includes(assignedRole)) {
        return NextResponse.json({ error: 'Staff accounts are created by an administrator' }, { status: 403 });
      }
      
      const parsedExtra = extraData?.extraData || extraData || {};
      const userData = buildUserData({
        ...parsedExtra,
        email: normalizedEmail,
        name,
        password: hashPassword(password),
        role: assignedRole,
      });

      const newUser = await prisma.appUser.create({
        data: userData
      });

      // Set up a dedicated Support chat for this user
      // Even the first user (Super Admin) can have one just to test it
      const welcomeChat = await prisma.appChat.create({
        data: buildChatData({
          type: 'support',
          participants: [newUser.id] // Only the user needs to be in the array, Admins see all support chats
        })
      });

      // Send the auto-reply from a system perspective
      let admin = await prisma.appUser.findFirst({ where: { role: 'Super Admin' } });
      if (!admin) admin = await prisma.appUser.findFirst({ where: { role: 'Admin' } });
      
      if (admin) await prisma.appMessage.create({
        data: buildMessageData({
          chatId: welcomeChat.id,
          senderId: admin.id,
          senderName: admin.name,
          senderInitials: admin.initials,
          senderColor: admin.color || '#000',
          content: `Thank you for visiting us! SAP is a critical enterprise system that connects all parts of a business into an intelligent suite on a fully digital platform. The management team will reach out to you soon. Let us know if you have any questions!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: false
        })
      });

      // To keep mock simplicity, we automatically add new users to all global groups (like the old mock logic did)
      const globalGroups = await prisma.appChat.findMany({ where: { type: 'group' } });
      for (const group of globalGroups) {
        await prisma.appChat.update({
          where: { id: group.id },
          data: { participants: { push: newUser.id } }
        });
      }

      return attachSession(NextResponse.json({ user: publicAccount(newUser) }), newUser);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
