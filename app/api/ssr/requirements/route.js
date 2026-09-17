import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildPostData } from '../defaults';
import { getSessionActor, isSjStaff, SJ_USER_FILTER } from '../session';
import { notifyUsers } from '../notify';
import { bumpRealtimeRevision } from '../realtime';
import { canSubmitRequirement, requirementScope } from './policy.mjs';
import { emailPattern, requirementMailConfig, sendRequirementEmail } from './email.mjs';

export async function GET(request) {
  try {
    const actor = await getSessionActor(request);
    const scope = requirementScope(actor);
    if (!scope) return NextResponse.json({ error: 'Requirements access required' }, { status: 403 });
    if (new URL(request.url).searchParams.get('config') === '1') {
      const company = actor.companyId ? await prisma.appCompany.findUnique({ where: { id: actor.companyId } }) : null;
      return NextResponse.json(requirementMailConfig(company));
    }
    const submissions = await prisma.appRequirementSubmission.findMany({
      where: scope, orderBy: { createdAt: 'desc' }, take: 1000,
    });
    const taskIds = submissions.map(item => item.taskId);
    const companyIds = [...new Set(submissions.map(item => item.companyId).filter(Boolean))];
    const senderIds = [...new Set(submissions.map(item => item.senderId))];
    const [tasks, companies, senders, workers, profiles] = await Promise.all([
      taskIds.length ? prisma.appRequirementTask.findMany({ where: { id: { in: taskIds } } }) : [],
      companyIds.length ? prisma.appCompany.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }) : [],
      senderIds.length ? prisma.appUser.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true } }) : [],
      taskIds.length ? prisma.appTaskWorker.findMany({ where: { taskId: { in: taskIds } }, select: { taskId: true, userName: true, status: true, joinedAt: true, completedAt: true } }) : [],
      taskIds.length ? prisma.appTaskProfile.findMany({ where: { taskId: { in: taskIds } }, select: { id: true, taskId: true, addedByName: true, text: true, attachment: true, status: true, createdAt: true } }) : [],
    ]);
    const items = submissions.map(item => {
      const task = tasks.find(task => task.id === item.taskId);
      const taskProfiles = profiles.filter(profile => profile.taskId === item.taskId);
      return {
        ...item,
        title: task?.title || 'Requirement', description: task?.description || '',
        status: task?.status || 'open', postId: task?.postId || null,
        closedAt: task?.closedAt || null, closedByName: task?.closedByName || null,
        companyName: companies.find(company => company.id === item.companyId)?.name || 'Individual client',
        senderName: senders.find(sender => sender.id === item.senderId)?.name || item.fromEmail,
        workers: workers.filter(worker => worker.taskId === item.taskId).sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)),
        profileCount: taskProfiles.length,
        // Users track progress without receiving candidate attachments or contact details.
        profiles: actor.role === 'Participant' ? [] : taskProfiles,
      };
    });
    const q = String(new URL(request.url).searchParams.get('q') || '').trim().toLowerCase();
    return NextResponse.json(q ? items.filter(item => [item.token, item.title, item.companyName, item.senderName, item.status].some(value => String(value || '').toLowerCase().includes(q))) : items);
  } catch (error) {
    console.error('Requirements GET API error:', error);
    return NextResponse.json({ error: error.message || 'Could not load requirements' }, { status: 500 });
  }
}


export async function POST(request) {
  const actor = await getSessionActor(request);
  if (!canSubmitRequirement(actor)) return NextResponse.json({ error: 'Requirement submission is not allowed for this account' }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const title = String(data.subject || '').trim().slice(0, 160);
  const body = String(data.body || '').trim().slice(0, 10000);
  const signature = String(data.signature || '').trim().slice(0, 1000);
  const toEmail = String(data.to || '').trim() || null;
  const cc = [...new Set(String(data.cc || '').split(/[;,\s]+/).map(value => value.trim().toLowerCase()).filter(Boolean))];
  if (!title || !body) return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
  if (!emailPattern.test(actor.email || '') || cc.length > 5 || cc.some(value => !emailPattern.test(value))) {
    return NextResponse.json({ error: 'A valid account email and up to five valid CC addresses are required' }, { status: 400 });
  }
  const company = actor.companyId ? await prisma.appCompany.findUnique({ where: { id: actor.companyId } }) : null;
  if (actor.companyId && !company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  let task;
  let submission;
  try {
    const post = await prisma.appPost.create({
      data: buildPostData({
        authorId: actor.id,
        authorName: actor.name,
        authorRole: actor.role,
        category: 'Announcements',
        title,
        content: body,
        visibility: 'internal',
        isRequirement: true,
        companyId: company?.id || null,
      }),
    });
    task = await prisma.appRequirementTask.create({
      data: {
        postId: post.id,
        title,
        description: body,
        createdById: actor.id,
        createdByName: actor.name,
        companyId: company?.id || null,
      },
    });
    const token = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(5).toString('hex').toUpperCase()}`;
    submission = await prisma.appRequirementSubmission.create({
      data: {
        token,
        taskId: task.id,
        companyId: company?.id || null,
        senderId: actor.id,
        fromEmail: actor.email,
        cc,
        signature: signature || null,
        emailStatus: 'sending',
      },
    });
  } catch (error) {
    console.error('Requirement submission DB error:', error);
    return NextResponse.json({ error: 'Could not submit requirement. Please try again.' }, { status: 500 });
  }

  // Attempt email send with a 4s ceiling so it NEVER blocks the client
  let mail = { emailStatus: 'pending', emailError: null };
  try {
    const emailPromise = sendRequirementEmail({ submission, task, company, toEmail });
    mail = await Promise.race([
      emailPromise,
      new Promise(resolve => setTimeout(() => resolve({ emailStatus: 'sending', emailError: null }), 4000)),
    ]);
  } catch (err) {
    console.error('sendRequirementEmail error:', err);
    mail = { emailStatus: 'failed', emailError: err.message };
  }

  if (mail?.emailStatus && mail.emailStatus !== 'sending') {
    await prisma.appRequirementSubmission.update({ where: { id: submission.id }, data: mail }).catch(() => {});
  }

  // Push notifications and realtime bumps run in background (fire-and-forget)
  (async () => {
    try {
      const staff = await prisma.appUser.findMany({
        where: { ...SJ_USER_FILTER, role: { in: ['Super Admin', 'Admin', 'Employee'] }, restricted: false },
        select: { id: true },
      });
      await notifyUsers(staff.map(user => user.id), {
        title: `New requirement from ${company?.name || actor.name}`,
        body: `${submission.token}: ${title}`,
        url: `/ssr-app/home?section=tokens&token=${encodeURIComponent(submission.token)}`,
        data: { type: 'task', taskId: task.id, postId: task.postId, token: submission.token },
      });
    } catch (e) {
      console.error('Requirement background notification error:', e);
    }
    bumpRealtimeRevision('posts').catch(() => {});
    bumpRealtimeRevision('tasks').catch(() => {});
  })();

  return NextResponse.json({
    token: submission.token,
    taskId: task.id,
    postId: task.postId,
    emailStatus: mail.emailStatus,
    emailError: mail.emailError,
  }, { status: 201 });
}


export async function PATCH(request) {
  const actor = await getSessionActor(request);
  const scope = requirementScope(actor);
  if (!scope || !(canSubmitRequirement(actor) || isSjStaff(actor))) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (typeof data?.token !== 'string' || !data.token) return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  const submission = await prisma.appRequirementSubmission.findFirst({ where: { ...scope, token: data.token } });
  if (!submission) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  // Unknown outcomes need provider review; only definitely unsent messages can be retried.
  const claim = await prisma.appRequirementSubmission.updateMany({
    where: { id: submission.id, emailStatus: { in: ['failed', 'not_configured'] } },
    data: { emailStatus: 'sending', emailError: null },
  });
  if (!claim.count) return NextResponse.json({ error: 'Email was sent, is being sent, or needs SJ to check its delivery status.' }, { status: 409 });
  try {
    const task = await prisma.appRequirementTask.findUnique({ where: { id: submission.taskId } });
    const company = submission.companyId ? await prisma.appCompany.findUnique({ where: { id: submission.companyId } }) : null;
    if (!task) throw new Error('Requirement task missing');
    const mail = await sendRequirementEmail({ submission, task, company });
    await prisma.appRequirementSubmission.update({ where: { id: submission.id }, data: mail });
    return NextResponse.json(mail);
  } catch {
    await prisma.appRequirementSubmission.update({ where: { id: submission.id }, data: { emailStatus: 'unknown', emailError: 'SJ must check the email provider before resending.' } }).catch(() => {});
    return NextResponse.json({ error: 'Could not confirm email status. Your requirement is saved.' }, { status: 503 });
  }
}
