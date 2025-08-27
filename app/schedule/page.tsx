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

  // ✅ Fetch all slots and all rooms
  const slots = await prisma.timeSlot.findMany({
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const rooms = await prisma.room.findMany();

  // ✅ Generate all possible slot-room combos
  const allSlots = slots.flatMap((slot) =>
    rooms.map((room) => ({
      id: `${slot.id}-${room.id}`, // synthetic id
      slotId: slot.id,
      roomId: room.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: { id: room.id, name: room.name },
    }))
  );

  return (
    <ScheduleClient
      schedules={schedules}
      conflicts={conflicts}
      allSlots={allSlots}
    />
  );
}
