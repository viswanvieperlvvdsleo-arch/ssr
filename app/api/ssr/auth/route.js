import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildChatData, buildMessageData, buildUserData, normalizeRole } from '../defaults';

export async function POST(req) {
  try {
    const { action, email, password, name, role, category, ...extraData } = await req.json();

    if (action === 'deleteAccount') {
      const user = await prisma.appUser.findUnique({ where: { email } });
      if (!user || user.password !== password) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }
      await prisma.appUser.delete({ where: { id: user.id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      const user = await prisma.appUser.findUnique({ where: { email } });
      if (!user || user.password !== password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      if (category) {
        const requestedRole = normalizeRole(category);
        const isPrivilegedAccount = user.role === 'Admin' || user.role === 'Super Admin';
        if (!isPrivilegedAccount && requestedRole !== user.role) {
          return NextResponse.json({
            error: `This account is registered as ${user.role}. Please choose ${user.role} and try again.`,
          }, { status: 403 });
        }
      }
      return NextResponse.json({ user });
    }

    if (action === 'signup') {
      const existingUser = await prisma.appUser.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }

      // Check if this is the very first user in the system
      const totalUsersCount = await prisma.appUser.count();
      const isFirstUser = totalUsersCount === 0;

      // Map User -> Participant. First user gets Super Admin automatically.
      let assignedRole = normalizeRole(role || category);
      if (isFirstUser) {
        assignedRole = 'Super Admin';
      }
      
      const parsedExtra = extraData?.extraData || extraData || {};
      const userData = buildUserData({
        ...parsedExtra,
        email,
        name,
        password,
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
      
      // Auto-create a default admin if none exists so the chat works!
      if (!admin) {
         admin = await prisma.appUser.create({
           data: buildUserData({
             email: 'admin.system@ssr.com',
             name: 'System Admin',
             password: 'adminpassword123',
             role: 'Super Admin',
             initials: 'SA',
             color: '#0A6ED1'
           })
         });
      }

      await prisma.appMessage.create({
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

      return NextResponse.json({ user: newUser });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
