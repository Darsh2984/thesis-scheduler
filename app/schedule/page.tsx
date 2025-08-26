import { prisma } from "@/lib/prisma";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const schedules = await prisma.schedule.findMany({
    include: {
      topic: { include: { supervisor: true, reviewer: true } },
      room: true,
      slot: true,
    },
    orderBy: [
      { slot: { date: "asc" } },
      { slot: { startTime: "asc" } },
    ],
  });

  const conflicts = await prisma.conflict.findMany({
    include: {
      topic: {
        select: {
          id: true,
          title: true,
          studentId: true,
          studentName: true,
          studentEmail: true,
        },
      },
    },
  });

  return <ScheduleClient schedules={schedules} conflicts={conflicts} />;
}
