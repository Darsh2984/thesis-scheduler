import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Room name required' }), { status: 400 });
    }

    const room = await prisma.room.create({
      data: { name: name.trim() },
    });

    return new Response(JSON.stringify({ message: 'Room created', room }), { status: 200 });
  } catch (error) {
    console.error('❌ Error saving room:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to save room' }), { status: 500 });
  }
}

export async function GET() {
  try {
    const rows = await prisma.room.findMany({ orderBy: { id: 'asc' } });
    return new Response(JSON.stringify({ rows }), { status: 200 });
  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch rooms' }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));

    if (!id) {
      return new Response(JSON.stringify({ error: 'Room id required' }), { status: 400 });
    }

    await prisma.room.delete({ where: { id } });

    return new Response(JSON.stringify({ message: 'Room deleted' }), { status: 200 });
  } catch (error) {
    console.error('❌ Error deleting room:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete room' }), { status: 500 });
  }
}
