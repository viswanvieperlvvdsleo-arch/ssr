import { NextResponse } from 'next/server';
import { prisma } from '../prisma';
import { buildCourseData } from '../defaults';

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
    const data = await req.json();
    const newCourse = await prisma.appCourse.create({ data: buildCourseData(data) });
    return NextResponse.json(newCourse);
  } catch (error) {
    console.error('Courses POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { action, id, userId } = await req.json();
    if (action !== 'toggleSave' || !id || !userId) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const course = await prisma.appCourse.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await prisma.appCourse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Courses DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
