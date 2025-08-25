import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { userId, date } = await req.json();

  if (!userId || !date) {
    return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });
  }

  await prisma.userUnavailability.create({
    data: { userId: Number(userId), date: new Date(date) },
  });

  return NextResponse.json({ message: `Unavailability added for ${date}.` });
}
