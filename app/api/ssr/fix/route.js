import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET(req) {
  const results = {};
  try {
    results.userCount = await prisma.appUser.count();
  } catch (e) {
    results.userCountError = e.message;
  }

  try {
    results.hasDirectCallModel = typeof prisma.appDirectCall !== 'undefined';
    if (results.hasDirectCallModel) {
      results.directCallCount = await prisma.appDirectCall.count();
    }
  } catch (e) {
    results.directCallError = e.message;
  }

  try {
    results.requirementSubmissionCount = await prisma.appRequirementSubmission.count();
  } catch (e) {
    results.requirementSubmissionError = e.message;
  }

  try {
    results.requirementTaskCount = await prisma.appRequirementTask.count();
  } catch (e) {
    results.requirementTaskError = e.message;
  }

  try {
    results.users = await prisma.appUser.findMany({ select: { id: true, email: true, role: true }, take: 5 });
  } catch (e) {
    results.usersError = e.message;
  }

  return NextResponse.json(results);
}

