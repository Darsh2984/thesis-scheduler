import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getDatesInRange(from, to, excludeDates = [], skipFridays = false) {
  const dates = [];
  const start = new Date(from + "T00:00:00.000Z");
  const end = new Date(to + "T00:00:00.000Z");

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const isFriday = d.getUTCDay() === 5;

    if (skipFridays && isFriday) continue;
    if (excludeDates.includes(iso)) continue;

    dates.push(iso); // ✅ keep as string
  }
  return dates;
}
function overlapsBreak(start, end, breaks) {
  return breaks.some(b => !(end <= b.start || start >= b.end));
}

function generateDaySlots(startTime, endTime, interval, breaks = []) {
  const slots = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  let t = new Date(0, 0, 0, sh, sm);
  const end = new Date(0, 0, 0, eh, em);

  while (t < end) {
    let slotStart = new Date(t);
    let slotEnd = new Date(t.getTime() + interval * 60000);

    // ✅ stop if this slot would go past the working end
    if (slotEnd > end) break;

    const sStr = slotStart.toTimeString().slice(0, 5);
    const eStr = slotEnd.toTimeString().slice(0, 5);

    // check if overlaps a break
    const breakHit = breaks.find(b => !(eStr <= b.start || sStr >= b.end));
    if (breakHit) {
      // ⏩ jump directly to the end of the break
      const [bh, bm] = breakHit.end.split(":").map(Number);
      t = new Date(0, 0, 0, bh, bm);
      continue;
    }

    slots.push({ start: sStr, end: eStr });
    t = slotEnd;
  }

  return slots;
}


export async function POST(req) {
  try {
    const body = await req.json();
    const {
      from,
      to,
      startTime,
      endTime,
      interval,
      excluded = [],       // array of "YYYY-MM-DD"
      breaks = [],         // [{ start:"12:00", end:"13:00"}]
      excludeFridays = false
    } = body;

    if (!from || !to) {
      return NextResponse.json({ error: "From/To required" }, { status: 400 });
    }

    // ✅ respect excluded dates + Fridays
    const validDates = getDatesInRange(from, to, excluded, excludeFridays);
    if (validDates.length === 0) {
      return NextResponse.json({ error: "No valid dates after exclusions" }, { status: 400 });
    }
    const created = [];

    // clear only slots for validDates (not excluded ones)
await prisma.timeSlot.deleteMany({
  where: { date: { in: validDates.map(d => new Date(d)) } }
});

// create slots
for (const date of validDates) {
  const daySlots = generateDaySlots(startTime, endTime, interval, breaks);
  for (const s of daySlots) {
    const slot = await prisma.timeSlot.create({
      data: {
        date: new Date(date + "T00:00:00.000Z"), // ✅ normalized
        startTime: s.start,
        endTime: s.end,
      },
    });
    created.push(slot);
  }
}


    return NextResponse.json({
      message: `✅ Generated ${created.length} slots`,
      rows: created
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
