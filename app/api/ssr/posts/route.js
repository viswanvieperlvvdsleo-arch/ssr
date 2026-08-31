import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildPostData, hasEmployeePermission } from '../defaults';
import { notifyUsers } from '../notify';

export async function GET(req) {
  try {
    const posts = await prisma.appPost.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Posts GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const newPost = await prisma.appPost.create({ data: buildPostData(data) });
    const recipients = await prisma.appUser.findMany({
      where: { id: { not: newPost.authorId } },
      select: { id: true },
    });
    await notifyUsers(recipients.map(user => user.id), {
      title: 'New post on SSR Learning Platform',
      body: newPost.title || newPost.content.slice(0, 100) || 'A new post is available',
      url: `/ssr-app/home?postId=${newPost.id}`,
      data: { type: 'post', postId: newPost.id },
    });
    return NextResponse.json(newPost);
  } catch (error) {
    console.error('Posts POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, action, userId, comment } = await req.json();
    
    if (action === 'toggleLike') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const hasLiked = post.likedBy?.includes(userId);
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          likes: hasLiked ? { decrement: 1 } : { increment: 1 },
          likedBy: hasLiked ? post.likedBy.filter(uid => uid !== userId) : { push: userId }
        }
      });
      if (!hasLiked && post.authorId !== userId) {
        const actor = await prisma.appUser.findUnique({ where: { id: userId }, select: { name: true } });
        await notifyUsers([post.authorId], {
          title: 'New like on your post',
          body: `${actor?.name || 'Someone'} liked your post.`,
          url: `/ssr-app/home?postId=${post.id}`,
          data: { type: 'like', postId: post.id },
        });
      }
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
      const updatedPost = await prisma.appPost.update({
        where: { id },
        data: {
          commentsList: { push: comment },
          comments: { increment: 1 }
        }
      });
      const commentAuthorId = comment?.authorId || comment?.userId;
      if (commentAuthorId && post.authorId !== commentAuthorId) {
        await notifyUsers([post.authorId], {
          title: 'New comment on your post',
          body: `${comment?.authorName || 'Someone'} commented on your post.`,
          url: `/ssr-app/home?postId=${post.id}`,
          data: { type: 'comment', postId: post.id },
        });
      }
      return NextResponse.json(updatedPost);
    }

    if (action === 'deleteComment') {
      const post = await prisma.appPost.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const targetComment = (post.commentsList || []).find(item => item.id === comment?.id);
      if (!targetComment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      const actor = userId ? await prisma.appUser.findUnique({ where: { id: userId } }) : null;
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
    await prisma.appPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Posts DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
