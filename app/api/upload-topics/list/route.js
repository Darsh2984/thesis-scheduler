import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const rows = await prisma.bachelorTopic.findMany({
    include: { supervisor: true, reviewer: true },
    orderBy: { id: 'asc' },
  });

  return NextResponse.json({
    count: rows.length,
    rows: rows.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.studentName,
      studentEmail: t.studentEmail,
      title: t.title,
      supervisor: t.supervisor?.name || '',
      examiner: t.reviewer?.name || '',
    })),
  });
}
