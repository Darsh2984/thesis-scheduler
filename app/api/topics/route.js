import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const rows = await prisma.bachelorTopic.findMany({
    include: { supervisor: true, reviewer: true },
    orderBy: { id: 'asc' },
  });

  return new Response(JSON.stringify({
    count: rows.length,
    rows: rows.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.studentName,
      studentEmail: t.studentEmail,
      title: t.title,
      supervisor: t.supervisor?.name || '',
      supervisorEmail: t.supervisor?.email || '',
      examiner: t.reviewer?.name || '',
      examinerEmail: t.reviewer?.email || '',
    })),
  }), { status: 200 });
}

// Manual create (expects JSON body with student + supervisor/reviewer emails)
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      studentId, studentName, studentEmail, title,
      supervisorEmail, reviewerEmail,
      supervisorName, reviewerName,
    } = body || {};

    if (!studentId || !studentName || !studentEmail || !title || !supervisorEmail || !reviewerEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const supervisor = await prisma.user.upsert({
      where: { email: supervisorEmail },
      update: {},
      create: { name: supervisorName || supervisorEmail.split('@')[0], email: supervisorEmail, role: 'FT_SUPERVISOR' },
    });

    const reviewer = await prisma.user.upsert({
      where: { email: reviewerEmail },
      update: {},
      create: { name: reviewerName || reviewerEmail.split('@')[0], email: reviewerEmail, role: 'REVIEWER' },
    });

    const created = await prisma.bachelorTopic.create({
      data: {
        studentId, studentName, studentEmail, title,
        supervisorId: supervisor.id, reviewerId: reviewer.id,
      },
      include: { supervisor: true, reviewer: true },
    });

    return new Response(JSON.stringify({
      topic: {
        id: created.id,
        studentId: created.studentId,
        studentName: created.studentName,
        studentEmail: created.studentEmail,
        title: created.title,
        supervisor: created.supervisor?.name || '',
        supervisorEmail: created.supervisor?.email || '',
        examiner: created.reviewer?.name || '',
        examinerEmail: created.reviewer?.email || '',
      }
    }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to create topic' }), { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // If you don't have ON DELETE CASCADE, delete dependents first:
    await prisma.$transaction([
      prisma.schedule.deleteMany({}),
      prisma.conflict.deleteMany({}),
      prisma.bachelorTopic.deleteMany({}),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/topics failed:', err);
    return NextResponse.json({ error: 'Failed to delete all topics' }, { status: 500 });
  }
}
