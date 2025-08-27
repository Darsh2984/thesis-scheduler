import { prisma } from "@/lib/prisma";

export async function GET(req, context) {
  const { params } = await context; // ✅ await here
  const userId = parseInt(params.id, 10);

  const schedules = await prisma.schedule.findMany({
    include: {
      topic: { include: { supervisor: true, reviewer: true } },
      slot: true,
      room: true,
    },
    where: {
      OR: [
        { topic: { supervisorId: userId } },
        { topic: { reviewerId: userId } },
      ],
    },
  });

  const headers = [
    "Student ID",
    "Student Name",
    "Student Email",
    "Topic",
    "Supervisor",
    "Reviewer",
    "Room",
    "Date",
    "Time",
  ];

  const rows = schedules.map((s) => [
    s.topic.studentId,
    s.topic.studentName,
    s.topic.studentEmail,
    s.topic.title,
    s.topic.supervisor?.name || "—",
    s.topic.reviewer?.name || "—",
    s.room.name,
    s.slot.date.toISOString().split("T")[0],
    `from ${s.slot.startTime} to ${s.slot.endTime}`,
  ]);

  const csvContent =
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="user_${userId}_schedule.csv"`,
    },
  });
}
