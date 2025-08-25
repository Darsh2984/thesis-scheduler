import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function getDatesInRange(from, to) {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
  }
  return dates;
}

export async function POST(req) {
  const { userId, from, to } = await req.json();

  if (!userId || !from || !to) {
    return NextResponse.json({ error: 'Missing inputs' }, { status: 400 });
  }

  const dates = getDatesInRange(from, to);
  for (const date of dates) {
    await prisma.userUnavailability.create({
      data: { userId: Number(userId), date },
    });
  }

  return NextResponse.json({ message: `${dates.length} unavailability dates added.` });
}
