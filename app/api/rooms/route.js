import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.room.findMany({ orderBy: { id: 'asc' } });
    return new Response(JSON.stringify({
      rows: rows.map(r => ({ id: r.id, name: r.name, capacity: r.capacity ?? null }))
    }), { status: 200 });
  } catch (err) {
    console.error('❌ rooms GET error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch rooms' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = (body?.name || '').trim();
    const capRaw = body?.capacity;
    const capacity = capRaw === '' || capRaw == null ? null : Number(capRaw);

    if (!name) {
      return new Response(JSON.stringify({ error: 'Room name required' }), { status: 400 });
    }

    const room = await prisma.room.create({
      data: { name, ...(Number.isFinite(capacity) ? { capacity } : {}) },
    });

    return new Response(JSON.stringify({
      room: { id: room.id, name: room.name, capacity: room.capacity ?? null }
    }), { status: 201 });
  } catch (err) {
    console.error('❌ rooms POST error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to save room' }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    const all = searchParams.get('all');

    if (idStr) {
      const id = Number(idStr);
      if (!Number.isInteger(id)) {
        return new Response(JSON.stringify({ error: 'Invalid room id' }), { status: 400 });
      }
      await prisma.room.delete({ where: { id } });
      return new Response(null, { status: 204 }); // no body
    }

    if (all === '1') {
      await prisma.room.deleteMany({});
      return new Response(null, { status: 204 }); // no body
    }

    return new Response(JSON.stringify({ error: 'Specify ?id=123 or ?all=1' }), { status: 400 });
  } catch (err) {
    console.error('❌ rooms DELETE error:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete room(s)' }), { status: 500 });
  }
}
