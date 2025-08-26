import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(_req, { params }) {
  try {
    await prisma.userUnavailability.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: 'Unavailability removed' });
  } catch {
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
