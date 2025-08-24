import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const FIXED_SLOTS = [
  ["09:00", "09:30"],
  ["09:30", "10:00"],
  ["10:00", "10:30"],
  ["10:30", "11:00"],
  ["11:00", "11:30"],
  ["12:00", "12:30"],
  ["12:30", "13:00"],
  ["13:00", "13:30"],
  ["13:30", "14:00"],
  ["14:30", "15:00"],
  ["15:00", "15:30"],
  ["15:30", "16:00"],
  ["16:00", "16:30"],
  ["16:30", "17:00"],
];

function getDatesInRange(from, to, excludeDates = []) {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const isFriday = d.getDay() === 5; // Friday = 5
    const formatted = d.toISOString().split("T")[0];

    if (isFriday) continue;
    if (excludeDates.includes(formatted)) continue;

    dates.push(new Date(d)); // copy of date
  }
  return dates;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { from, to, excluded = [] } = body;

    if (!from || !to) {
      return NextResponse.json({ error: "Missing from/to dates" }, { status: 400 });
    }

    // Delete old schedules and timeslots
    await prisma.schedule.deleteMany();
    await prisma.timeSlot.deleteMany();

    const dates = getDatesInRange(from, to, excluded);
    const createdSlots = [];

    for (const date of dates) {
      for (const [startTime, endTime] of FIXED_SLOTS) {
        const slot = await prisma.timeSlot.create({
          data: {
            date: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())),
            startTime,
            endTime,
          },
        });
        createdSlots.push(slot);
      }
    }

    return NextResponse.json({
      message: `✅ Generated ${createdSlots.length} time slots for ${dates.length} days`,
      rows: createdSlots.map(s => ({
        id: s.id,
        date: s.date.toISOString().split('T')[0],
        start: s.startTime,
        end: s.endTime,
      })),
    });
  } catch (err) {
    console.error("❌ Timeslot generation error:", err);
    return NextResponse.json({ error: "Failed to generate time slots" }, { status: 500 });
  }
}
