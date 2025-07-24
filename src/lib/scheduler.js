import { prisma } from '@/lib/prisma';

export async function runScheduler() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();

  try {
    const topics = await prisma.bachelorTopic.findMany({
      include: { supervisor: true, reviewer: true },
    });

    const slots = await prisma.timeSlot.findMany();
    const rooms = await prisma.room.findMany();

    const usedByUser = new Map(); // userId -> Set of slot keys
    const usedRooms = new Map();  // slotKey -> Set of room IDs

    for (const topic of topics) {
      let assigned = false;

      for (const slot of slots) {
        const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;

        const sUsed = usedByUser.get(topic.supervisorId) || new Set();
        const rUsed = usedByUser.get(topic.reviewerId) || new Set();
        const roomUsed = usedRooms.get(slotKey) || new Set();

        if (sUsed.has(slotKey) || rUsed.has(slotKey)) {
          continue; // supervisor or reviewer is busy
        }

        // Find first room that's free at this time
        const availableRoom = rooms.find(room => !roomUsed.has(room.id));
        if (!availableRoom) continue;

        // Create the schedule
        await prisma.schedule.create({
          data: {
            topicId: topic.id,
            roomId: availableRoom.id,
            slotId: slot.id,
          },
        });

        // Mark this slot as used by supervisor, reviewer, and room
        sUsed.add(slotKey);
        rUsed.add(slotKey);
        roomUsed.add(availableRoom.id);

        usedByUser.set(topic.supervisorId, sUsed);
        usedByUser.set(topic.reviewerId, rUsed);
        usedRooms.set(slotKey, roomUsed);

        assigned = true;
        break;
      }

      if (!assigned) {
        await prisma.conflict.create({
          data: {
            topicId: topic.id,
            reason: 'No available slot with free room and available supervisor & reviewer',
          },
        });
      }
    }

    console.log('✅ Scheduling completed.');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
    throw err;
  }
}
