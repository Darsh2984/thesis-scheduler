import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROLE_MAP = {
  'FT_SUPERVISOR': 'FT_SUPERVISOR',
  'PT_SUPERVISOR': 'PT_SUPERVISOR',
  'REVIEWER': 'REVIEWER',
  'BOTH': 'BOTH',
  'FT SUPERVISOR': 'FT_SUPERVISOR',
  'PT SUPERVISOR': 'PT_SUPERVISOR',
  'SUPERVISOR': 'FT_SUPERVISOR',
};

export async function POST(req) {
  try {
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const enumRole = ROLE_MAP[String(role).trim().toUpperCase()];
    if (!enumRole) {
      return NextResponse.json(
        { error: 'Invalid role. Use FT_SUPERVISOR | PT_SUPERVISOR | REVIEWER | BOTH' },
        { status: 400 }
      );
    }

    const created = await prisma.user.upsert({
      where: { email },
      update: { name, role: enumRole },
      create: { name, email, role: enumRole },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/users failed:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json({ rows: users });
}

export async function DELETE() {
  try {
    const counts = await prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.deleteMany();
      const conflict = await tx.conflict.deleteMany();
      const topics   = await tx.bachelorTopic.deleteMany();
      const pref     = await tx.preferredDate.deleteMany();
      const unavail  = await tx.userUnavailability.deleteMany();
      const slots    = await tx.timeSlot.deleteMany();
      const rooms    = await tx.room.deleteMany();
      const users    = await tx.user.deleteMany();

      return {
        schedulesDeleted: schedule.count,
        conflictsDeleted: conflict.count,
        topicsDeleted: topics.count,
        preferredDatesDeleted: pref.count,
        unavailabilityDeleted: unavail.count,
        timeSlotsDeleted: slots.count,
        roomsDeleted: rooms.count,
        usersDeleted: users.count,
      };
    });

    return NextResponse.json({ ok: true, ...counts });
  } catch (e) {
    console.error('DELETE /api/users failed:', e);
    return NextResponse.json({ ok: false, error: 'Failed to clear users' }, { status: 500 });
  }
}
