import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';


export const runtime = 'nodejs';

export async function PATCH(req, { params }) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const {
      studentId, studentName, studentEmail, title,
      supervisorEmail, reviewerEmail,
      supervisorName, reviewerName,
    } = body || {};

    let supervisorId, reviewerId;

    if (supervisorEmail) {
      const sup = await prisma.user.upsert({
        where: { email: supervisorEmail },
        update: supervisorName ? { name: supervisorName } : {},
        create: { name: supervisorName || supervisorEmail.split('@')[0], email: supervisorEmail, role: 'FT_SUPERVISOR' },
      });
      supervisorId = sup.id;
    }

    if (reviewerEmail) {
      const rev = await prisma.user.upsert({
        where: { email: reviewerEmail },
        update: reviewerName ? { name: reviewerName } : {},
        create: { name: reviewerName || reviewerEmail.split('@')[0], email: reviewerEmail, role: 'REVIEWER' },
      });
      reviewerId = rev.id;
    }

    const updated = await prisma.bachelorTopic.update({
      where: { id },
      data: {
        ...(studentId !== undefined ? { studentId } : {}),
        ...(studentName !== undefined ? { studentName } : {}),
        ...(studentEmail !== undefined ? { studentEmail } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(supervisorId ? { supervisorId } : {}),
        ...(reviewerId ? { reviewerId } : {}),
      },
      include: { supervisor: true, reviewer: true },
    });

    return new Response(JSON.stringify({
      topic: {
        id: updated.id,
        studentId: updated.studentId,
        studentName: updated.studentName,
        studentEmail: updated.studentEmail,
        title: updated.title,
        supervisor: updated.supervisor?.name || '',
        supervisorEmail: updated.supervisor?.email || '',
        examiner: updated.reviewer?.name || '',
        examinerEmail: updated.reviewer?.email || '',
      }
    }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to update topic' }), { status: 500 });
  }
}


export async function DELETE(_req, { params }) {
  try {
    const id = Number(params?.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await prisma.bachelorTopic.delete({ where: { id } });

    // Always return JSON so the client doesn't choke on empty bodies
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Record not found — treat as success so UI stays consistent
    if (err?.code === 'P2025') {
      return NextResponse.json({ ok: true, note: 'already deleted' });
    }

    console.error('DELETE /api/topics/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}