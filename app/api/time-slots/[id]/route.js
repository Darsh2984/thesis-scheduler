import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(_, { params }) {
  try {
    await prisma.timeSlot.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: 'Slot deleted' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
