import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const records = await prisma.preferredDate.findMany({
      include: { user: true },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      count: records.length,
      rows: records.map((r) => ({
        id: r.id,
        user: r.user?.name || r.user?.email || 'Unknown',
        date: r.date ? r.date.toISOString().split('T')[0] : '',
      })),
    });
  } catch (error) {
    console.error("❌ Failed to fetch preferred dates:", error);
    return NextResponse.json(
      { error: 'Failed to fetch preferred dates' },
      { status: 500 }
    );
  }
}