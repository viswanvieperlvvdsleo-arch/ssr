import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildPostData, hasEmployeePermission } from '../defaults';
import { notifyUsers } from '../notify';
import { bumpRealtimeRevision } from '../realtime';
import { getSessionActor, SJ_USER_FILTER } from '../session';
import { POST as submitRequirement } from '../requirements/route';

export async function GET(req) {
  try {
    const viewerId = new URL(req.url).searchParams.get('viewerId');
    const viewer = await getSessionActor(req);
    let effectiveViewer = viewer;
    if (!effectiveViewer && viewerId) {
      effectiveViewer = await prisma.appUser.findUnique({ where: { id: viewerId } }).catch(() => null);
    }
    const canViewInternal = effectiveViewer && !effectiveViewer.companyId && ['Employee', 'Admin', 'Super Admin'].includes(effectiveViewer.role) && !effectiveViewer.restricted;
    const posts = await prisma.appPost.findMany({
      where: effectiveViewer?.companyId ? {
        OR: [{ companyId: effectiveViewer.companyId }, { visibility: 'public' }],
      } : canViewInternal ? {
        OR: [{ companyId: null }, { companyId: { not: null }, isRequirement: true }],
      } : { visibility: 'public' },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    return NextResponse.json(posts || []);
  } catch (error) {
    console.error('Posts GET API Error:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const author = await getSessionActor(req);
    if (!author || author.id !== data.authorId || !hasEmployeePermission(author, 'post_feeds') || author.restricted) {
      return NextResponse.json({ error: 'You do not have permission to publish posts' }, { status: 403 });
    }
    if (author.companyId && data.isRequirement) {
      const submissionRequest = { cookies: req.cookies, json: async () => ({ subject: data.title, body: data.content }) };
      const result = await submitRequirement(submissionRequest);
      const submission = await result.json();
      if (!result.ok) return NextResponse.json(submission, { status: result.status });
      const post = await prisma.appPost.findUnique({ where: { id: submission.postId } });
      return NextResponse.json({ ...post, token: submission.token, emailStatus: submission.emailStatus }, { status: 201 });
    }
    data.visibility = author.companyId || data.visibility === 'internal' ? 'internal' : 'public';
    data.isRequirement = data.visibility === 'internal' && Boolean(data.isRequirement);
    const newPost = await prisma.appPost.create({ data: buildPostData({ ...data, authorName: author.name, authorRole: author.role, companyId: author.companyId || null }) });
    if (newPost.isRequirement) {
      await prisma.appRequirementTask.create({
        data: {
          postId: newPost.id,
          title: newPost.title || 'Untitled requirement',
          description: newPost.content || null,
          createdById: newPost.authorId,
          createdByName: newPost.authorName,
          teamId: data.teamId || null,
        },
      });
    }
    const recipients = await prisma.appUser.findMany({
      where: {
        id: { not: newPost.authorId },
        restricted: false,
        ...(author.companyId ? { companyId: author.companyId } : newPost.visibility === 'internal' ? { ...SJ_USER_FILTER, role: { in: ['Employee', 'Admin', 'Super Admin'] } } : {}),
      },
      select: { id: true },
    });
    await notifyUsers(recipients.map(user => user.id), {
      title: 'New post on SJ INFO BUSINESS SOLUTIONS',
      body: newPost.title || newPost.content.slice(0, 100) || 'A new post is available',
      url: `/ssr-app/home?section=feed&postId=${encodeURIComponent(newPost.id)}${newPost.visibility === 'internal' ? '&feed=internal' : ''}`,
      data: { type: 'post', postId: newPost.id },
    });
    await Promise.all([
      bumpRealtimeRevision('posts'),
      ...(newPost.isRequirement ? [bumpRealtimeRevision('tasks')] : []),
    ]);
    return NextResponse.json(newPost);
  } catch (error) {
    console.error('Posts POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, action, userId, comment } = await req.json();
    const sessionActor = await getSessionActor(req);
    if (!sessionActor || sessionActor.id !== userId) return NextResponse.json({ error: 'Account access denied' }, { status: 403 });
    const guardedPost = await prisma.appPost.findUnique({ where: { id } });
    if (!guardedPost) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (sessionActor.companyId) {
      const isPublicSjPost = guardedPost.visibility === 'public' && !guardedPost.companyId;
      const isOwnCompanyPost = guardedPost.companyId === sessionActor.companyId;
      if (!isPublicSjPost && !isOwnCompanyPost) return NextResponse.json({ error: 'Post access denied' }, { status: 403 });
    }
    if (guardedPost.visibility === 'internal') {
      const actor = sessionActor;
      const canAccessInternal = actor && ['Employee', 'Admin', 'Super Admin'].includes(actor.role) && !actor.restricted;
      if (!canAccessInternal) {
        return NextResponse.json({ error: 'You do not have permission to access this post' }, { status: 403 });
      }
    }
    
    if (action === 'like' || action === 'toggleLike') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const hasLiked = post.likedBy?.includes(userId);
      if (action === 'like' && hasLiked) return NextResponse.json(post);
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          likes: hasLiked ? { decrement: 1 } : { increment: 1 },
          likedBy: hasLiked ? post.likedBy.filter(uid => uid !== userId) : { push: userId }
        }
      });
      if (!hasLiked && post.authorId !== userId) {
        const actor = sessionActor;
        await notifyUsers([post.authorId], {
          title: 'New like on your post',
          body: `${actor?.name || 'Someone'} liked your post.`,
          url: `/ssr-app/home?section=feed&postId=${encodeURIComponent(post.id)}`,
          data: { type: 'like', postId: post.id },
        });
      }
      await bumpRealtimeRevision('posts');
      return NextResponse.json(updatedPost);
    }

    if (action === 'toggleSave') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const hasSaved = post.savedBy?.includes(userId);
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          savedBy: hasSaved ? post.savedBy.filter(uid => uid !== userId) : { push: userId }
        }
      });
      return NextResponse.json(updatedPost);
    }

    if (action === 'addComment') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const text = String(comment?.text || '').trim().slice(0, 2000);
      if (!text) return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
      const safeComment = { id: String(comment?.id || `c${Date.now()}`), authorId: sessionActor.id, authorName: sessionActor.name, authorInitials: sessionActor.initials, authorColor: sessionActor.color, time: 'Just now', text };
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          commentsList: { push: safeComment },
          comments: { increment: 1 }
        }
      });
      const commentAuthorId = sessionActor.id;
      if (commentAuthorId && post.authorId !== commentAuthorId) {
        await notifyUsers([post.authorId], {
          title: 'New comment on your post',
          body: `${comment?.authorName || 'Someone'} commented on your post.`,
          url: `/ssr-app/home?section=feed&postId=${encodeURIComponent(post.id)}`,
          data: { type: 'comment', postId: post.id },
        });
      }
      await bumpRealtimeRevision('posts');
      return NextResponse.json(updatedPost);
    }

    if (action === 'deleteComment') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const targetComment = (post.commentsList || []).find(item => item.id === comment?.id);
      if (!targetComment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      const actor = sessionActor;
      const isAdmin = actor?.role === 'Admin' || actor?.role === 'Super Admin';
      const canModerate = isAdmin || hasEmployeePermission(actor, 'post_feeds');
      const isAuthor = targetComment.authorId === userId || targetComment.userId === userId;
      if (!actor || (!isAuthor && !canModerate)) {
        return NextResponse.json({ error: 'You do not have permission to delete this comment' }, { status: 403 });
      }
      const newCommentsList = (post.commentsList || []).filter(item => item.id !== comment.id);
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          commentsList: newCommentsList,
          comments: newCommentsList.length
        }
      });
      await bumpRealtimeRevision('posts');
      return NextResponse.json(updatedPost);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Posts PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const [post, actor] = await Promise.all([
      id ? prisma.appPost.findUnique({ where: { id } }) : null,
      getSessionActor(req),
    ]);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!actor || actor.id !== userId || (actor.companyId && post.companyId !== actor.companyId) || !['Admin', 'Super Admin'].includes(actor.role) || actor.restricted) {
      return NextResponse.json({ error: 'You do not have permission to delete this post' }, { status: 403 });
    }
    const task = await prisma.appRequirementTask.findUnique({ where: { postId: id } });
    if (task && await prisma.appRequirementSubmission.findUnique({ where: { taskId: task.id } })) {
      return NextResponse.json({ error: 'Submitted client requirements cannot be deleted here' }, { status: 409 });
    }
    if (task) {
      await Promise.all([
        prisma.appTaskWorker.deleteMany({ where: { taskId: task.id } }),
        prisma.appTaskProfile.deleteMany({ where: { taskId: task.id } }),
        prisma.appTaskEvent.deleteMany({ where: { taskId: task.id } }),
      ]);
      await prisma.appRequirementTask.delete({ where: { id: task.id } });
    }
    await prisma.appPost.delete({ where: { id } });
    await Promise.all([
      bumpRealtimeRevision('posts'),
      ...(task ? [bumpRealtimeRevision('tasks')] : []),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Posts DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
