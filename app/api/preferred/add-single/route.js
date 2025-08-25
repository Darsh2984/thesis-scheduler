import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId, date } = await req.json();

    if (!userId || !date) {
      return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });
    }

    await prisma.preferredDate.create({
      data: { userId: Number(userId), date: new Date(date) },
    });

    return NextResponse.json({ message: `Preferred date added for ${date}.` });
  } catch (error) {
    console.error('❌ Error adding preferred date:', error);
    return NextResponse.json({ error: 'Failed to add preferred date' }, { status: 500 });
  }
}
