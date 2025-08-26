import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(_req, { params }) {
  try {
    await prisma.preferredDate.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: 'Preferred date removed' });
  } catch {
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
