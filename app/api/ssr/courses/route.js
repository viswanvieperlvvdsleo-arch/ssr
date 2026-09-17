import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildCourseData, hasEmployeePermission } from '../defaults';
import { notifyUsers } from '../notify';
import { getSessionActor, isSjStaff } from '../session';

function canPublish(actor) {
  return isSjStaff(actor) && hasEmployeePermission(actor, 'post_services');
}

export async function GET(req) {
  try {
    const courses = await prisma.appCourse.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Courses GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const actor = await getSessionActor(req);
    if (!canPublish(actor)) return NextResponse.json({ error: 'Only SJ staff can publish services' }, { status: 403 });
    const data = await req.json();
    const newCourse = await prisma.appCourse.create({ data: buildCourseData(data) });
    const recipients = await prisma.appUser.findMany({
      where: data.creatorId ? { id: { not: data.creatorId } } : {},
      select: { id: true },
    });
    await notifyUsers(recipients.map(user => user.id), {
      title: 'New service available',
      body: newCourse.title,
      url: `/ssr-app/home?section=courses&courseId=${encodeURIComponent(newCourse.id)}`,
      data: { type: 'service', courseId: newCourse.id },
    });
    return NextResponse.json(newCourse);
  } catch (error) {
    console.error('Courses POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const actor = await getSessionActor(req);
    if (!actor) return NextResponse.json({ error: 'Please sign in again' }, { status: 401 });
    const payload = await req.json();
    const { action, id, userId } = payload;
    if (!id) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const course = await prisma.appCourse.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    if (action === 'update') {
      if (!canPublish(actor)) {
        return NextResponse.json({ error: 'You do not have permission to edit services' }, { status: 403 });
      }
      const updatedCourse = await prisma.appCourse.update({
        where: { id },
        data: buildCourseData({ ...course, ...payload, id: undefined }),
      });
      return NextResponse.json(updatedCourse);
    }

    if (action !== 'toggleSave' || !userId || userId !== actor.id) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const savedBy = Array.isArray(course.savedBy) ? course.savedBy : [];
    const hasSaved = savedBy.includes(userId);
    const updatedCourse = await prisma.appCourse.update({
      where: { id },
      data: { savedBy: hasSaved ? savedBy.filter(savedId => savedId !== userId) : { push: userId } },
    });
    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Courses PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const actor = await getSessionActor(req);
    if (!canPublish(actor)) return NextResponse.json({ error: 'Only SJ staff can delete services' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await prisma.appCourse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Courses DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
