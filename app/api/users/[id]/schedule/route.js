import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ GET: user info + schedule
export async function GET(_req, { params }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    // fetch user
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // fetch schedule with topic + slot + room
    const schedule = await prisma.schedule.findMany({
      where: {
        OR: [
          { topic: { supervisorId: id } },
          { topic: { reviewerId: id } },
        ],
      },
      include: {
        topic: { select: { id: true, title: true, studentId: true, studentName: true, studentEmail: true, supervisor: true, reviewer: true } },
        slot: true,
        room: true,
      },
    });

    // transform rows
    const rows = schedule.map(s => ({
      scheduleId: s.id,
      topicTitle: s.topic.title,
      studentId: s.topic.studentId,
      studentName: s.topic.studentName,
      studentEmail: s.topic.studentEmail,
      role: s.topic.supervisorId === id ? "Supervisor" : "Reviewer",
      supervisorName: s.topic.supervisor?.name || null,
      reviewerName: s.topic.reviewer?.name || null,
      date: s.slot.date,
      startTime: s.slot.startTime,
      endTime: s.slot.endTime,
      roomName: s.room.name,
    }));

    return NextResponse.json(
      { user, schedule: rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('❌ Error fetching user schedule:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
