import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildChatData, hasEmployeePermission } from '../defaults';

export async function GET(req) {
  try {
    const chats = await prisma.appChat.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Chats GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    if (data.type === 'direct' && data.createdBy) {
      const creator = await prisma.appUser.findUnique({ where: { id: data.createdBy } });
      const targetId = Array.isArray(data.participants) ? data.participants.find(id => id !== data.createdBy) : null;
      const target = targetId ? await prisma.appUser.findUnique({ where: { id: targetId } }) : null;
      const isStaff = creator && (creator.role === 'Admin' || creator.role === 'Super Admin' || hasEmployeePermission(creator, 'view_chats'));
      const sharedGroups = creator && targetId ? await prisma.appChat.findMany({ where: { type: 'group', participants: { hasEvery: [creator.id, targetId] } } }) : [];
      const sharedPrivateChatEnabled = sharedGroups.some(group => group.privateChatEnabled !== false);
      const isGroupAdmin = sharedGroups.some(group => group.createdBy === creator?.id || group.admins?.includes(creator?.id));
      const isAllowed = isStaff || target?.role === 'Admin' || target?.role === 'Super Admin' || isGroupAdmin || sharedPrivateChatEnabled;
      if (!isAllowed) return NextResponse.json({ error: 'Private chat is disabled for this group' }, { status: 403 });
    }
    if (data.type === 'group') {
      const creatorId = data.createdBy;
      const creator = creatorId ? await prisma.appUser.findUnique({ where: { id: creatorId } }) : null;
      const canCreateGroup = creator && (
        creator.role === 'Admin' ||
        creator.role === 'Super Admin' ||
        hasEmployeePermission(creator, 'view_chats')
      );
      const participants = Array.isArray(data.participants) ? [...new Set(data.participants)] : [];

      if (!canCreateGroup) {
        return NextResponse.json({ error: 'Only admins and chat-access employees can create groups' }, { status: 403 });
      }
      if (!data.name?.trim()) {
        return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
      }
      if (participants.length < 2 || !participants.includes(creatorId)) {
        return NextResponse.json({ error: 'Add at least one other member to the group' }, { status: 400 });
      }
      data.participants = participants;
      data.createdBy = creatorId;
      data.admins = [creatorId];
    }
    if ((data.type === 'direct' || data.type === 'support') && Array.isArray(data.participants)) {
      const existing = await prisma.appChat.findFirst({
        where: {
          type: data.type,
          participants: data.type === 'direct'
            ? { hasEvery: data.participants }
            : { has: data.participants[0] },
        },
      });
      if (existing) return NextResponse.json(existing);
    }

    const newChat = await prisma.appChat.create({ data: buildChatData(data) });
    return NextResponse.json(newChat);
  } catch (error) {
    console.error('Chats POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, action, muted, userId, ...data } = await req.json();
    const chat = await prisma.appChat.findUnique({ where: { id } });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    if (['addParticipants', 'removeParticipant', 'leave', 'deleteChat', 'exitAndDelete', 'togglePin'].includes(action)) {
      if (!userId) return NextResponse.json({ error: 'User is required' }, { status: 400 });
      const actor = await prisma.appUser.findUnique({ where: { id: userId } });
      if (!actor) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const isAdmin = actor.role === 'Admin' || actor.role === 'Super Admin';
      const isGroupAdmin = chat.type === 'group' && (chat.createdBy === userId || chat.admins?.includes(userId));
      const deletedFor = Array.isArray(chat.deletedFor) ? chat.deletedFor : [];
      const pinnedBy = Array.isArray(chat.pinnedBy) ? chat.pinnedBy : [];

      if (action === 'addParticipants') {
        if (chat.type !== 'group' || (!isAdmin && !isGroupAdmin)) {
          return NextResponse.json({ error: 'Only a group admin can add members' }, { status: 403 });
        }
        const requestedIds = Array.isArray(data.targetUserId) ? data.targetUserId : [data.targetUserId];
        const targetIds = [...new Set(requestedIds.map(value => String(value || '').trim()).filter(Boolean))];
        const validUsers = targetIds.length > 0
          ? await prisma.appUser.findMany({ where: { id: { in: targetIds } }, select: { id: true } })
          : [];
        const validIds = validUsers.map(user => user.id);
        const participants = [...new Set([...chat.participants, ...validIds])];
        const updatedChat = await prisma.appChat.update({
          where: { id },
          data: {
            participants,
            deletedFor: deletedFor.filter(participantId => !validIds.includes(participantId)),
          },
        });
        return NextResponse.json({ chat: updatedChat });
      }

      if (action === 'removeParticipant') {
        if (chat.type !== 'group' || (!isAdmin && !isGroupAdmin)) {
          return NextResponse.json({ error: 'Only a group admin can remove members' }, { status: 403 });
        }
        const targetId = String(data.targetUserId || '').trim();
        if (!targetId || targetId === chat.createdBy || !chat.participants.includes(targetId)) {
          return NextResponse.json({ error: 'That member cannot be removed' }, { status: 400 });
        }
        const updatedChat = await prisma.appChat.update({
          where: { id },
          data: {
            participants: chat.participants.filter(participantId => participantId !== targetId),
            admins: chat.admins.filter(adminId => adminId !== targetId),
            deletedFor: [...new Set([...deletedFor, targetId])],
          },
        });
        return NextResponse.json({ chat: updatedChat });
      }

      if (action === 'togglePin') {
        const nextPinnedBy = pinnedBy.includes(userId) ? pinnedBy.filter(id => id !== userId) : [...pinnedBy, userId];
        const updatedChat = await prisma.appChat.update({ where: { id }, data: { pinnedBy: nextPinnedBy } });
        return NextResponse.json({ chat: updatedChat });
      }

      if (action === 'deleteChat') {
        const updatedChat = await prisma.appChat.update({ where: { id }, data: { deletedFor: [...new Set([...deletedFor, userId])] } });
        return NextResponse.json({ chat: updatedChat });
      }

      if (action === 'leave' || action === 'exitAndDelete') {
        if (!chat.participants.includes(userId)) return NextResponse.json({ error: 'You are not a member of this chat' }, { status: 403 });
        const participants = chat.participants.filter(participantId => participantId !== userId);
        const remainingAdmins = chat.admins.filter(adminId => adminId !== userId);
        const nextLeader = chat.createdBy === userId ? (participants[0] || null) : chat.createdBy;
        const admins = nextLeader && remainingAdmins.length === 0 ? [nextLeader] : remainingAdmins;
        const updatedChat = await prisma.appChat.update({
          where: { id },
          data: {
            participants,
            admins,
            createdBy: nextLeader,
            deletedFor: [...new Set([...deletedFor, userId])],
          },
        });
        return NextResponse.json({ chat: updatedChat });
      }
    }

    if (action === 'markRead') {
      if (!userId) return NextResponse.json({ error: 'User is required' }, { status: 400 });
      const unreadBy = chat.unreadBy && typeof chat.unreadBy === 'object' && !Array.isArray(chat.unreadBy) ? { ...chat.unreadBy } : {};
      unreadBy[userId] = 0;
      const updatedChat = await prisma.appChat.update({ where: { id }, data: { unreadBy } });
      return NextResponse.json(updatedChat);
    }

    if (data.privateChatEnabled !== undefined) {
      const actor = userId ? await prisma.appUser.findUnique({ where: { id: userId } }) : null;
      const canManagePrivateChat = actor && (
        actor.role === 'Admin' ||
        actor.role === 'Super Admin' ||
        chat.admins?.includes(userId) ||
        chat.createdBy === userId
      );
      if (chat.type !== 'group' || !canManagePrivateChat) {
        return NextResponse.json({ error: 'Only a group admin can change private chat access' }, { status: 403 });
      }
    }

    // If 'muted' is provided, we use mutedBy logic
    if (muted !== undefined && userId) {
      const hasMuted = chat.mutedBy?.includes(userId);
      if (muted && !hasMuted) {
        data.mutedBy = { push: userId };
      } else if (!muted && hasMuted) {
        data.mutedBy = chat.mutedBy.filter(uid => uid !== userId);
      }
    }

    const updatedChat = await prisma.appChat.update({
      where: { id },
      data
    });
    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Chats PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
