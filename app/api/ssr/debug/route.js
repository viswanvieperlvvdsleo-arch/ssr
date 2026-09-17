import { NextResponse } from 'next/server';
import { prisma } from '../prisma';

export async function GET() {
  const report = {};

  try {
    const user = await prisma.appUser.findFirst({ select: { id: true, email: true, role: true } });
    report.prismaUser = { ok: true, user };
  } catch (err) {
    report.prismaUser = { ok: false, error: err.message, stack: err.stack };
  }

  try {
    report.hasAppDirectCall = typeof prisma.appDirectCall !== 'undefined';
    if (report.hasAppDirectCall) {
      const call = await prisma.appDirectCall.findFirst();
      report.prismaDirectCall = { ok: true, call };
    } else {
      report.prismaDirectCall = { ok: false, error: 'prisma.appDirectCall is undefined in @prisma/client' };
    }
  } catch (err) {
    report.prismaDirectCall = { ok: false, error: err.message, stack: err.stack };
  }

  try {
    const revision = await prisma.appRealtimeRevision.findUnique({ where: { id: 'global' } });
    report.prismaRealtime = { ok: true, revision };
  } catch (err) {
    report.prismaRealtime = { ok: false, error: err.message, stack: err.stack };
  }

  try {
    const count = await prisma.appRequirementSubmission.count();
    report.prismaRequirement = { ok: true, count };
  } catch (err) {
    report.prismaRequirement = { ok: false, error: err.message, stack: err.stack };
  }

  return NextResponse.json(report);
}
