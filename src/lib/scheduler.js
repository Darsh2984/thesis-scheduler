import { prisma } from '@/lib/prisma';

export async function runScheduler() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();
  try {
    // Clear existing schedule and conflicts
    

    const topics = await prisma.bachelorTopic.findMany({
      include: { supervisor: true, reviewer: true },
    });

    const slots = await prisma.timeSlot.findMany();
    const rooms = await prisma.room.findMany();

    const usedByUser = new Map(); // userId -> Set of slot keys

    for (const topic of topics) {
      let assigned = false;

      for (const slot of slots) {
        const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;

        const sUsed = usedByUser.get(topic.supervisorId) || new Set();
        const rUsed = usedByUser.get(topic.reviewerId) || new Set();

        if (sUsed.has(slotKey) || rUsed.has(slotKey)) {
          continue; // Conflict
        }

        // Assign to first room (or you can rotate/select smarter)
        const room = rooms[0];
        if (!room) continue;

        await prisma.schedule.create({
          data: {
            topicId: topic.id,
            roomId: room.id,
            slotId: slot.id,
          },
        });

        // Mark as used
        sUsed.add(slotKey);
        rUsed.add(slotKey);
        usedByUser.set(topic.supervisorId, sUsed);
        usedByUser.set(topic.reviewerId, rUsed);

        assigned = true;
        break;
      }

      if (!assigned) {
        await prisma.conflict.create({
          data: {
            topicId: topic.id,
            reason: 'No common available slot for supervisor & reviewer',
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
