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
    const unavailability = await prisma.userUnavailability.findMany();
    const preferredDates = await prisma.preferredDate.findMany();

    // Map: userId -> Set<YYYY-MM-DD>
    const unavailableMap = new Map<number, Set<string>>();
    for (const entry of unavailability) {
      const d = entry.date.toISOString().split('T')[0];
      if (!unavailableMap.has(entry.userId)) unavailableMap.set(entry.userId, new Set());
      unavailableMap.get(entry.userId)!.add(d);
    }

    // Map: userId -> Set<YYYY-MM-DD>
    const preferredMap = new Map<number, Set<string>>();
    for (const entry of preferredDates) {
      const d = entry.date.toISOString().split('T')[0];
      if (!preferredMap.has(entry.userId)) preferredMap.set(entry.userId, new Set());
      preferredMap.get(entry.userId)!.add(d);
    }

    const usedByUser = new Map<number, Set<string>>();  // userId -> Set of slot keys
    const usedRooms = new Map<string, Set<number>>();   // slotKey -> Set of room IDs
    const reviewerRoomLock = new Map<number, number>(); // reviewerId -> locked roomId
    const reviewerDayCount = new Map<number, Set<string>>(); // reviewerId -> Set of used dates
    

    for (const topic of topics) {
      const { supervisorId, reviewerId } = topic;
      const reviewer = topic.reviewer;

      // 1. Filter out slots where supervisor/reviewer is unavailable or already busy
      const validSlots = slots.filter(slot => {
        const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
        const dateStr = slot.date.toISOString().split('T')[0];

        const supervisorUnavailable = unavailableMap.get(supervisorId)?.has(dateStr);
        const reviewerUnavailable = unavailableMap.get(reviewerId)?.has(dateStr);
        const supervisorUsed = usedByUser.get(supervisorId)?.has(slotKey);
        const reviewerUsed = usedByUser.get(reviewerId)?.has(slotKey);

        if (supervisorUnavailable || reviewerUnavailable || supervisorUsed || reviewerUsed) {
          return false;
        }

        // Reviewer day count limit
        if (reviewer.role === 'REVIEWER') {
          let days = reviewerDayCount.get(reviewerId);
          if (!days) {
            days = new Set();
            reviewerDayCount.set(reviewerId, days);
          }
          const topicCount = topics.filter(t => t.reviewerId === reviewerId).length;
          const maxDays = topicCount <= 6 ? 1 : topicCount <= 12 ? 2 : 3;
          if (!days.has(dateStr) && days.size >= maxDays) return false;
        }

        return true;
      });

      // 2. Sort validSlots so preferred dates come first
      validSlots.sort((a, b) => {
        const aDate = a.date.toISOString().split('T')[0];
        const bDate = b.date.toISOString().split('T')[0];
        const prefS = preferredMap.get(supervisorId) || new Set();
        const prefR = preferredMap.get(reviewerId) || new Set();
        const aScore = (prefS.has(aDate) ? 1 : 0) + (prefR.has(aDate) ? 1 : 0);
        const bScore = (prefS.has(bDate) ? 1 : 0) + (prefR.has(bDate) ? 1 : 0);
        return bScore - aScore;
      });

      let assigned = false;

      for (const slot of validSlots) {
        const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
        const slotDateStr = slot.date.toISOString().split('T')[0];
        const sUsed = usedByUser.get(supervisorId) || new Set();
        const rUsed = usedByUser.get(reviewerId) || new Set();
        const roomUsed = usedRooms.get(slotKey) || new Set();

        // Find a valid room
        let availableRoom = null;
        for (const room of rooms) {
          if (roomUsed.has(room.id)) continue;

          const lockedRoom = reviewerRoomLock.get(reviewerId);
          if (reviewer.role === 'REVIEWER' && lockedRoom && lockedRoom !== room.id) continue;

          availableRoom = room;
          break;
        }

        if (!availableRoom) continue;

        // Schedule
        await prisma.schedule.create({
          data: {
            topicId: topic.id,
            roomId: availableRoom.id,
            slotId: slot.id,
          },
        });

        sUsed.add(slotKey);
        rUsed.add(slotKey);
        roomUsed.add(availableRoom.id);

        usedByUser.set(supervisorId, sUsed);
        usedByUser.set(reviewerId, rUsed);
        usedRooms.set(slotKey, roomUsed);

        // Reviewer room lock
        if (reviewer.role === 'REVIEWER') {
          reviewerRoomLock.set(reviewerId, availableRoom.id);
          let days = reviewerDayCount.get(reviewerId);
          if (!days) {
            days = new Set();
            reviewerDayCount.set(reviewerId, days);
          }
          days.add(slotDateStr);
        }

        assigned = true;
        break;
      }

      if (!assigned) {
        await prisma.conflict.create({
          data: {
            topicId: topic.id,
            reason: 'No available slot (conflict: unavailability, room, limit, or schedule clash)',
          },
        });
      }
    }

    console.log('✅ Scheduler completed with preferred dates and reviewer day limits.');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
    throw err;
  }
}
