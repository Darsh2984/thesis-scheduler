import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      count: rooms.length,
      rows: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
      })),
    });
  } catch (error) {
    console.error("❌ Failed to fetch rooms:", error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
