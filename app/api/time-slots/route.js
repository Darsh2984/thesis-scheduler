import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 📌 Generate slots
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      from,
      to,
      excludeFridays = true,
      excluded = [],
      workday = { start: "09:00", end: "17:00" },
      intervalMinutes = 30,
      breaks = [],
    } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing from/to dates" },
        { status: 400 }
      );
    }

    // Clear old slots
    await prisma.timeSlot.deleteMany();

    const created = [];
    const startDate = new Date(from);
    const endDate = new Date(to);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const weekday = d.getUTCDay();

      // Skip Fridays
      if (excludeFridays && weekday === 5) continue;
      // Skip user-selected excluded dates
      if (excluded.includes(dateStr)) continue;

      let start = toMinutes(workday.start);
      const end = toMinutes(workday.end);

      while (start + intervalMinutes <= end) {
        const startTime = toHHMM(start);
        const endTime = toHHMM(start + intervalMinutes);

        // Skip overlaps with breaks
        const overlapsBreak = breaks.some((b) => {
          const bStart = toMinutes(b.start);
          const bEnd = toMinutes(b.end);
          return Math.max(start, bStart) < Math.min(start + intervalMinutes, bEnd);
        });
        if (overlapsBreak) {
          start += intervalMinutes;
          continue;
        }

        const slot = await prisma.timeSlot.create({
          data: {
            date: new Date(dateStr),
            startTime,
            endTime,
          },
        });

        created.push(slot);
        start += intervalMinutes;
      }
    }

    return NextResponse.json({
      message: `✅ Generated ${created.length} time slots`,
      rows: created.map((s) => ({
        id: s.id,
        date: s.date.toISOString().split("T")[0],
        start: s.startTime,
        end: s.endTime,
      })),
    });
  } catch (err) {
    console.error("❌ POST /api/time-slots error:", err);
    return NextResponse.json(
      { error: "Failed to generate time slots" },
      { status: 500 }
    );
  }
}

// 📌 Get all slots
export async function GET() {
  try {
    const slots = await prisma.timeSlot.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ rows: slots });
  } catch (err) {
    console.error("❌ GET /api/time-slots error:", err);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

// 📌 Delete all slots
export async function DELETE() {
  try {
    await prisma.timeSlot.deleteMany();
    return NextResponse.json({ message: "🧹 Cleared all slots" });
  } catch (err) {
    console.error("❌ DELETE /api/time-slots error:", err);
    return NextResponse.json(
      { error: "Failed to clear slots" },
      { status: 500 }
    );
  }
}

// Helpers
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}
