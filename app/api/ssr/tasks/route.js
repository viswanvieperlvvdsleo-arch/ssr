import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { notifyUsers } from '../notify';
import { bumpRealtimeRevision } from '../realtime';
import { getSessionActor, SJ_USER_FILTER } from '../session';

const STAFF_ROLES = ['Admin', 'Super Admin', 'Employee'];

async function hydrateTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : tasks ? [tasks] : [];
  if (!list.length) return [];
  const taskIds = list.map(task => task.id);
  const [workers, profiles, events, teams] = await Promise.all([
    prisma.appTaskWorker.findMany({ where: { taskId: { in: taskIds } }, orderBy: { joinedAt: 'asc' } }),
    prisma.appTaskProfile.findMany({ where: { taskId: { in: taskIds } }, orderBy: { createdAt: 'asc' } }),
    prisma.appTaskEvent.findMany({ where: { taskId: { in: taskIds } }, orderBy: { createdAt: 'asc' } }),
    prisma.appTeam.findMany(),
  ]);
  const teamNames = Object.fromEntries(teams.map(team => [team.id, team.name]));
  return list.map(task => ({
    ...task,
    teamName: task.teamId ? teamNames[task.teamId] || null : null,
    workers: workers.filter(worker => worker.taskId === task.id).map(worker => ({ ...worker, teamName: worker.teamId ? teamNames[worker.teamId] || null : null })),
    profiles: profiles.filter(profile => profile.taskId === task.id),
    events: events.filter(event => event.taskId === task.id),
  }));
}

async function getHydratedTask(taskId) {
  const task = await prisma.appRequirementTask.findUnique({ where: { id: taskId } });
  return (await hydrateTasks(task))[0] || null;
}

async function getActor(request, actorId) {
  const actor = await getSessionActor(request);
  if (actorId && actor?.id !== actorId) return null;
  if (!actor || actor.companyId || !STAFF_ROLES.includes(actor.role) || actor.restricted) return null;
  return actor;
}

async function notifyStaff(actorId, notification, excludedIds = []) {
  const excluded = [...new Set([actorId, ...excludedIds].filter(Boolean))];
  const recipients = await prisma.appUser.findMany({
    where: { ...SJ_USER_FILTER, role: { in: STAFF_ROLES }, id: { notIn: excluded }, restricted: false },
    select: { id: true },
  });
  return notifyUsers(recipients.map(user => user.id), notification);
}

async function notifyProfileStakeholders(task, actorId, notification) {
  const [workers, admins] = await Promise.all([
    prisma.appTaskWorker.findMany({ where: { taskId: task.id }, select: { userId: true } }),
    prisma.appUser.findMany({
      where: { ...SJ_USER_FILTER, role: { in: ['Admin', 'Super Admin'] }, restricted: false },
      select: { id: true },
    }),
  ]);
  const recipientIds = [...new Set([
    ...(task.companyId ? [] : [task.createdById]),
    ...workers.map(worker => worker.userId),
    ...admins.map(admin => admin.id),
  ].filter(id => id && id !== actorId))];
  return notifyUsers(recipientIds, notification);
}

async function notifyCompany(task, title, body) {
  if (!task.companyId) {
    const submission = await prisma.appRequirementSubmission.findUnique({ where: { taskId: task.id } });
    if (!submission) return;
    await notifyUsers([submission.senderId], {
      title, body,
      url: `/ssr-app/home?section=tokens&token=${encodeURIComponent(submission.token)}`,
      data: { type: 'requirement-progress', taskId: task.id, token: submission.token },
    });
    return;
  }
  const recipients = await prisma.appUser.findMany({ where: { companyId: task.companyId, restricted: false }, select: { id: true } });
  await notifyUsers(recipients.map(user => user.id), {
    title,
    body,
    url: '/ssr-app/company?section=tasks',
    data: { type: 'company-task', taskId: task.id },
  });
}

async function ensureTask(post) {
  return prisma.appRequirementTask.upsert({
    where: { postId: post.id },
    create: {
      postId: post.id,
      title: post.title || 'Untitled requirement',
      description: post.content || null,
      createdById: post.authorId,
      createdByName: post.authorName,
    },
    update: {},
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const viewer = await getSessionActor(req);
    if (viewer?.companyId) {
      if (searchParams.get('userId') && searchParams.get('userId') !== viewer.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      const postId = searchParams.get('postId');
      const tasks = await prisma.appRequirementTask.findMany({ where: { companyId: viewer.companyId, ...(postId ? { postId } : {}) }, orderBy: { createdAt: 'desc' } });
      const hydrated = await hydrateTasks(tasks);
      return NextResponse.json(postId ? hydrated[0] || null : hydrated);
    }
    const actor = await getActor(req, searchParams.get('userId'));
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required' }, { status: 403 });
    const postId = searchParams.get('postId');
    if (postId) {
      const post = await prisma.appPost.findUnique({ where: { id: postId }, select: { visibility: true } });
      if (!post || post.visibility !== 'internal') return NextResponse.json(null);
      const task = await prisma.appRequirementTask.findUnique({ where: { postId } });
      return NextResponse.json((await hydrateTasks(task))[0] || null);
    }
    const internalPosts = await prisma.appPost.findMany({ where: { visibility: 'internal' }, select: { id: true } });
    const tasks = await prisma.appRequirementTask.findMany({ where: { postId: { in: internalPosts.map(post => post.id) } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(await hydrateTasks(tasks));
  } catch (error) {
    console.error('Tasks GET API Error:', error);
    return NextResponse.json({ error: 'Could not load task board' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const actor = await getActor(req, body.actorId);
    if (!actor) return NextResponse.json({ error: 'Employee or admin access is required' }, { status: 403 });

    const post = body.postId ? await prisma.appPost.findUnique({ where: { id: body.postId } }) : null;
    if (post && post.visibility !== 'internal') {
      return NextResponse.json({ error: 'Task workflow is available only for internal posts' }, { status: 409 });
    }
    let task = body.taskId ? await prisma.appRequirementTask.findUnique({ where: { id: body.taskId } }) : null;
    if (!task && post) {
      if (!post.isRequirement) {
        await prisma.appPost.update({
          where: { id: post.id },
          data: { isRequirement: true, requirementStatus: 'open' },
        });
      }
      task = await ensureTask(post);
    }
    if (!task) return NextResponse.json({ error: 'Requirement task was not found' }, { status: 404 });

    const taskUrl = `/ssr-app/home?section=task-board&taskId=${encodeURIComponent(task.id)}`;

    if (body.action === 'claim') {
      if (task.status === 'closed') return NextResponse.json({ error: 'Closed requirements cannot be reopened' }, { status: 409 });
      const existing = await prisma.appTaskWorker.findUnique({
        where: { taskId_userId: { taskId: task.id, userId: actor.id } },
      });
      if (!existing) {
        await prisma.appTaskWorker.create({
          data: { taskId: task.id, userId: actor.id, userName: actor.name, teamId: actor.teamId || null },
        });
        await prisma.appTaskEvent.create({
          data: { taskId: task.id, actorId: actor.id, actorName: actor.name, type: 'joined' },
        });
        await notifyStaff(actor.id, {
          title: 'Requirement is being handled',
          body: `${actor.name} started working on ${task.title}.`,
          url: taskUrl,
          data: { type: 'task', taskId: task.id, postId: task.postId },
        });
        await notifyCompany(task, 'Requirement in sourcing', `${actor.name} started working on ${task.title}.`).catch(error => console.error('Company task notification failed:', error));
      }
      task = await prisma.appRequirementTask.update({ where: { id: task.id }, data: { status: 'in_progress' } });
      await prisma.appPost.update({ where: { id: task.postId }, data: { requirementStatus: 'in_progress' } });
      await Promise.all([bumpRealtimeRevision('tasks'), bumpRealtimeRevision('posts')]);
      return NextResponse.json(await getHydratedTask(task.id));
    }

    if (body.action === 'complete') {
      if (task.status === 'closed') return NextResponse.json({ error: 'This requirement is already closed' }, { status: 409 });
      const worker = await prisma.appTaskWorker.findUnique({
        where: { taskId_userId: { taskId: task.id, userId: actor.id } },
      });
      if (!worker) return NextResponse.json({ error: 'Join this requirement before completing your work' }, { status: 409 });
      const completion = await prisma.appTaskWorker.updateMany({
        where: { id: worker.id, status: { not: 'completed' } },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (completion.count > 0) {
        await prisma.appTaskEvent.create({ data: { taskId: task.id, actorId: actor.id, actorName: actor.name, type: 'worker_completed' } });
        await notifyStaff(actor.id, {
          title: 'Sourcing work completed',
          body: `${actor.name} completed their work on ${task.title}.`,
          url: taskUrl,
          data: { type: 'task', taskId: task.id, postId: task.postId },
        });
        await bumpRealtimeRevision('tasks');
        await notifyCompany(task, 'Sourcing work completed', `${actor.name} completed their work on ${task.title}.`).catch(error => console.error('Client notification failed:', error));
      }
      return NextResponse.json(await getHydratedTask(task.id));
    }

    if (body.action === 'addProfile') {
      if (task.status === 'closed') return NextResponse.json({ error: 'Profiles cannot be added to a closed requirement' }, { status: 409 });
      const text = String(body.text || '').trim();
      const attachment = body.attachment && body.attachment.url ? {
        url: body.attachment.url,
        mediaId: body.attachment.mediaId || null,
        name: body.attachment.name || 'Attachment',
        type: body.attachment.type || 'application/octet-stream',
        size: Number(body.attachment.size) || 0,
      } : null;
      if (!text && !attachment) return NextResponse.json({ error: 'Add profile details or an attachment' }, { status: 400 });
      const worker = await prisma.appTaskWorker.findUnique({
        where: { taskId_userId: { taskId: task.id, userId: actor.id } },
      });
      if (!worker && !['Admin', 'Super Admin'].includes(actor.role)) {
        return NextResponse.json({ error: 'Join this requirement before adding a profile' }, { status: 409 });
      }
      const requestedMentions = [...new Set((Array.isArray(body.mentions) ? body.mentions : []).map(String))].filter(id => id !== actor.id);
      const mentionedUsers = requestedMentions.length ? await prisma.appUser.findMany({
        where: { id: { in: requestedMentions }, ...SJ_USER_FILTER, role: { in: STAFF_ROLES } },
        select: { id: true },
      }) : [];
      const mentions = mentionedUsers.map(user => user.id);
      const profile = await prisma.appTaskProfile.create({
        data: {
          taskId: task.id,
          workerId: worker?.id || null,
          addedById: actor.id,
          addedByName: actor.name,
          text,
          attachment,
          mentions,
        },
      });
      await prisma.appTaskEvent.create({
        data: { taskId: task.id, actorId: actor.id, actorName: actor.name, type: 'profile_added', detail: { profileId: profile.id } },
      });
      const profileUrl = `${taskUrl}&profileId=${encodeURIComponent(profile.id)}`;
      await Promise.all([
        notifyCompany(task, 'New profile added', `${actor.name} added a profile to ${task.title}.`).catch(error => console.error('Client notification failed:', error)),
        notifyStaff(actor.id, {
          title: actor.name,
          body: `Added a new profile to ${task.title}.`,
          url: profileUrl,
          data: { type: 'task-profile', taskId: task.id, postId: task.postId, profileId: profile.id },
        }, mentions),
        ...(mentions.length ? [notifyUsers(mentions, {
          title: actor.name,
          body: `Mentioned you in a new profile for ${task.title}.`,
          url: profileUrl,
          data: { type: 'task-mention', taskId: task.id, postId: task.postId, profileId: profile.id },
        })] : []),
        bumpRealtimeRevision('tasks'),
      ]);
      return NextResponse.json(await getHydratedTask(task.id));
    }

    if (body.action === 'updateProfileStatus') {
      if (task.status === 'closed') return NextResponse.json({ error: 'Profiles cannot be updated after the requirement is closed' }, { status: 409 });
      const profileId = String(body.profileId || '');
      const nextStatus = String(body.profileStatus || '');
      const labels = { follow_up: 'Follow-up', rejected: 'Rejected', completed: 'Completed' };
      if (!labels[nextStatus]) return NextResponse.json({ error: 'Choose a valid profile status' }, { status: 400 });
      const profile = profileId ? await prisma.appTaskProfile.findUnique({ where: { id: profileId } }) : null;
      if (!profile || profile.taskId !== task.id) return NextResponse.json({ error: 'Candidate profile was not found' }, { status: 404 });
      const currentStatus = profile.status || 'new';
      const transitions = {
        new: ['follow_up', 'rejected'],
        follow_up: ['rejected', 'completed'],
        rejected: [],
        completed: [],
      };
      if (currentStatus === nextStatus) return NextResponse.json(await getHydratedTask(task.id));
      if (!transitions[currentStatus]?.includes(nextStatus)) {
        return NextResponse.json({ error: `${labels[currentStatus] || 'This status'} cannot be changed to ${labels[nextStatus]}` }, { status: 409 });
      }
      const updatedAt = new Date();
      const statusUpdate = await prisma.appTaskProfile.updateMany({
        where: {
          id: profile.id,
          ...(currentStatus === 'new' ? { OR: [{ status: 'new' }, { status: null }] } : { status: currentStatus }),
        },
        data: {
          status: nextStatus,
          statusUpdatedById: actor.id,
          statusUpdatedByName: actor.name,
          statusUpdatedAt: updatedAt,
        },
      });
      if (statusUpdate.count === 0) return NextResponse.json({ error: 'This profile was already updated by another employee' }, { status: 409 });
      await prisma.appTaskEvent.create({
        data: {
          taskId: task.id,
          actorId: actor.id,
          actorName: actor.name,
          type: 'profile_status_updated',
          detail: { profileId: profile.id, from: currentStatus, to: nextStatus },
        },
      });
      const profileUrl = `${taskUrl}&profileId=${encodeURIComponent(profile.id)}`;
      await Promise.all([
        notifyCompany(task, 'Profile status updated', `A profile for ${task.title} is now ${labels[nextStatus]}.`).catch(error => console.error('Client notification failed:', error)),
        notifyProfileStakeholders(task, actor.id, {
          title: actor.name,
          body: `Marked a candidate profile as ${labels[nextStatus]} for ${task.title}.`,
          url: profileUrl,
          data: { type: 'task-profile-status', taskId: task.id, postId: task.postId, profileId: profile.id, profileStatus: nextStatus },
        }),
        bumpRealtimeRevision('tasks'),
      ]);
      return NextResponse.json(await getHydratedTask(task.id));
    }

    if (body.action === 'close') {
      if (task.status === 'closed') return NextResponse.json(await getHydratedTask(task.id));
      const closure = await prisma.appRequirementTask.updateMany({
        where: { id: task.id, status: { not: 'closed' } },
        data: { status: 'closed', closedById: actor.id, closedByName: actor.name, closedAt: new Date() },
      });
      if (closure.count === 0) return NextResponse.json(await getHydratedTask(task.id));
      await Promise.all([
        prisma.appPost.update({ where: { id: task.postId }, data: { requirementStatus: 'closed' } }),
        prisma.appTaskEvent.create({ data: { taskId: task.id, actorId: actor.id, actorName: actor.name, type: 'closed' } }),
      ]);
      await notifyStaff(actor.id, {
        title: 'Requirement completed',
        body: `${actor.name} closed ${task.title}.`,
        url: taskUrl,
        data: { type: 'task', taskId: task.id, postId: task.postId },
      });
      await notifyCompany(task, 'Requirement completed', `${task.title} has been closed.`).catch(error => console.error('Company task notification failed:', error));
      await Promise.all([bumpRealtimeRevision('tasks'), bumpRealtimeRevision('posts')]);
      return NextResponse.json(await getHydratedTask(task.id));
    }

    return NextResponse.json({ error: 'Invalid task action' }, { status: 400 });
  } catch (error) {
    console.error('Tasks POST API Error:', error);
    return NextResponse.json({ error: error?.message || 'Could not update task' }, { status: 500 });
  }
}
