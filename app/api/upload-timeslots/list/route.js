import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const slots = await prisma.timeSlot.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      count: slots.length,
      rows: slots.map((s) => ({
        id: s.id,
        date: s.date ? s.date.toISOString().split('T')[0] : '',
        start: s.startTime ? s.startTime : '',
        end: s.endTime ? s.endTime : '',
      })),
    });
  } catch (error) {
    console.error("❌ Failed to fetch time slots:", error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}
