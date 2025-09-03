import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Accept a few spreadsheet-y variants and map to your Prisma enum
const ROLE_MAP = {
  'FT_SUPERVISOR': 'FT_SUPERVISOR',
  'PT_SUPERVISOR': 'PT_SUPERVISOR',
  'REVIEWER': 'REVIEWER',
  'BOTH': 'BOTH',
  // forgiving inputs
  'FT SUPERVISOR': 'FT_SUPERVISOR',
  'PT SUPERVISOR': 'PT_SUPERVISOR',
  'SUPERVISOR': 'FT_SUPERVISOR',
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, role } = body || {};

    if (!name || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const enumRole = ROLE_MAP[String(role).trim().toUpperCase()];
    if (!enumRole) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Use FT_SUPERVISOR | PT_SUPERVISOR | REVIEWER | BOTH' }),
        { status: 400 }
      );
    }

    // Upsert so re-adding same email updates name/role without throwing
    const created = await prisma.user.upsert({
      where: { email },
      update: { name, role: enumRole },
      create: { name, email, role: enumRole },
    });

    return new Response(JSON.stringify({ user: created }), {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('POST /api/users failed:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to create user' }), { status: 500 });
  }
}

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  return new Response(JSON.stringify({ rows: users }), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

// Create user manually
export async function DELETE() {
  try {
    // Delete in safe order. Use a transaction so it's all-or-nothing.
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

    return NextResponse.json(
      { ok: true, ...counts },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('DELETE /api/users failed:', e);
    // Return JSON even on error so the client can handle it gracefully
    return NextResponse.json(
      { ok: false, error: 'Failed to clear users' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
