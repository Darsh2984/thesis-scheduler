import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Fetch schedules for the user
    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          { topic: { supervisorId: userId } },
          { topic: { reviewerId: userId } },
        ],
      },
      include: {
        topic: {
          include: {
            supervisor: true,
            reviewer: true,
          },
        },
        slot: true,
        room: true,
      },
      orderBy: {
        slot: { date: "asc" },
      },
    });

    // Format CSV rows
    const rows = schedules.map((s) => {
      let role = "";
      if (s.topic.supervisorId === userId) role = "Supervisor";
      if (s.topic.reviewerId === userId) role = "Reviewer";

      return {
        scheduleId: s.id,
        topicTitle: s.topic.title,
        studentId: s.topic.studentId,
        studentName: s.topic.studentName,
        studentEmail: s.topic.studentEmail,
        role,
        supervisorName: s.topic.supervisor ? s.topic.supervisor.name : "",
        reviewerName: s.topic.reviewer ? s.topic.reviewer.name : "",
        date: new Date(s.slot.date).toLocaleDateString("en-US"),
        startTime: s.slot.startTime,
        endTime: s.slot.endTime,
        roomName: s.room.name,
      };
    });

    // Build CSV string
    const header = [
      "Schedule ID",
      "Topic Title",
      "Student ID",
      "Student Name",
      "Student Email",
      "Role",
      "Supervisor",
      "Reviewer",
      "Date",
      "Start Time",
      "End Time",
      "Room",
    ];

    const csvContent = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.scheduleId,
          `"${r.topicTitle}"`, // quote titles
          r.studentId,
          `"${r.studentName}"`,
          r.studentEmail,
          r.role,
          r.supervisorName,
          r.reviewerName,
          r.date,
          r.startTime,
          r.endTime,
          r.roomName,
        ].join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="user_${userId}_schedule.csv"`,
      },
    });
  } catch (err) {
    console.error("❌ Error generating CSV:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
