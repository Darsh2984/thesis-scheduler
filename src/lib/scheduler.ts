import { prisma } from '@/lib/prisma';

export async function runScheduler() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();

  try {
    const topics = await prisma.bachelorTopic.findMany({
      include: { supervisor: true, reviewer: true },
    });

    const slots = await prisma.timeSlot.findMany({ orderBy: { date: 'asc' } });
    const rooms = await prisma.room.findMany();
    const unavailability = await prisma.userUnavailability.findMany();
    const preferredDates = await prisma.preferredDate.findMany();

    // Maps for unavailability & preferences
    const unavailableMap = new Map<number, Set<string>>();
    for (const entry of unavailability) {
      const d = entry.date.toISOString().split('T')[0];
      if (!unavailableMap.has(entry.userId)) unavailableMap.set(entry.userId, new Set());
      unavailableMap.get(entry.userId)!.add(d);
    }

    const preferredMap = new Map<number, Set<string>>();
    for (const entry of preferredDates) {
      const d = entry.date.toISOString().split('T')[0];
      if (!preferredMap.has(entry.userId)) preferredMap.set(entry.userId, new Set());
      preferredMap.get(entry.userId)!.add(d);
    }

    // Usage tracking
    const usedByUser = new Map<number, Set<string>>(); // slotKey per user
    const usedRooms = new Map<string, Set<number>>();  // room ids per slotKey
    const reviewerRoomLock = new Map<number, number>(); // lock reviewer to a room
    const reviewerDayAssignments = new Map<number, Map<string, number>>(); // reviewerId -> date -> count

    // === LOOP over topics ===
    for (const topic of topics) {
      const { supervisorId, reviewerId } = topic;
      const supervisor = topic.supervisor;
      const reviewer = topic.reviewer;

      // Missing supervisor/reviewer handling
      if (!supervisor) {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'Supervisor not found in Users list' },
        });
        continue;
      }
      if (!reviewer) {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'Reviewer not found in Users list' },
        });
        continue;
      }

      // Invalid role rules
      if (reviewer.role === 'FT_SUPERVISOR') {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'Reviewer is FT_SUPERVISOR (not allowed)' },
        });
        continue;
      }
      if (supervisor.role === 'REVIEWER') {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'Supervisor is REVIEWER (not allowed)' },
        });
        continue;
      }

      // ============ SLOT SELECTION ============
      let assigned = false;

      // Preferred slots first
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

        // 🚨 enforce 8 topics per reviewer per day
        const reviewerAssignments = reviewerDayAssignments.get(reviewerId) || new Map();
        const assignedCount = reviewerAssignments.get(dateStr) || 0;
        if (assignedCount >= 8) {
          return false; // reviewer full on this date
        }

        return true;
      });

      // Sort slots: prioritize supervisor/reviewer preferred dates first
      validSlots.sort((a, b) => {
        const aDate = a.date.toISOString().split('T')[0];
        const bDate = b.date.toISOString().split('T')[0];
        const prefS = preferredMap.get(supervisorId) || new Set();
        const prefR = reviewerId ? preferredMap.get(reviewerId) || new Set() : new Set();
        const aScore = (prefS.has(aDate) ? 1 : 0) + (prefR.has(aDate) ? 1 : 0);
        const bScore = (prefS.has(bDate) ? 1 : 0) + (prefR.has(bDate) ? 1 : 0);
        return bScore - aScore;
      });

      // Try to assign a preferred slot
      for (const slot of validSlots) {
        const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
        const slotDateStr = slot.date.toISOString().split('T')[0];

        const sUsed = usedByUser.get(supervisorId) || new Set();
        const rUsed = usedByUser.get(reviewerId) || new Set();
        const roomUsed = usedRooms.get(slotKey) || new Set();

        let availableRoom: any = null;
        for (const room of rooms) {
          if (roomUsed.has(room.id)) continue;
          const lockedRoom = reviewerRoomLock.get(reviewerId);
          if (reviewer.role !== 'FT_SUPERVISOR' && lockedRoom && lockedRoom !== room.id) {
            continue;
          }
          availableRoom = room;
          break;
        }

        if (!availableRoom) continue;

        await prisma.schedule.create({
          data: { topicId: topic.id, roomId: availableRoom.id, slotId: slot.id },
        });

        // Track usage
        sUsed.add(slotKey);
        rUsed.add(slotKey);
        roomUsed.add(availableRoom.id);
        usedByUser.set(supervisorId, sUsed);
        usedByUser.set(reviewerId, rUsed);
        usedRooms.set(slotKey, roomUsed);
        reviewerRoomLock.set(reviewerId, availableRoom.id);

        let reviewerAssignments = reviewerDayAssignments.get(reviewerId);
        if (!reviewerAssignments) {
          reviewerAssignments = new Map();
          reviewerDayAssignments.set(reviewerId, reviewerAssignments);
        }
        reviewerAssignments.set(slotDateStr, (reviewerAssignments.get(slotDateStr) || 0) + 1);

        assigned = true;
        break;
      }

      // --- Phase 2: Fallback (if no preferred slot works, still try ANY slot but respect 8-per-day rule) ---
      if (!assigned) {
        for (const slot of slots) {
          const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
          const slotDateStr = slot.date.toISOString().split('T')[0];

          const sUsed = usedByUser.get(supervisorId) || new Set();
          const rUsed = usedByUser.get(reviewerId) || new Set();
          const roomUsed = usedRooms.get(slotKey) || new Set();

          if (sUsed.has(slotKey) || rUsed.has(slotKey)) continue;

          // 🚨 enforce 8 topics/day again
          const reviewerAssignments = reviewerDayAssignments.get(reviewerId) || new Map();
          const assignedCount = reviewerAssignments.get(slotDateStr) || 0;
          if (assignedCount >= 8) continue;

          let availableRoom: any = null;
          for (const room of rooms) {
            if (!roomUsed.has(room.id)) {
              availableRoom = room;
              break;
            }
          }
          if (!availableRoom) continue;

          await prisma.schedule.create({
            data: { topicId: topic.id, roomId: availableRoom.id, slotId: slot.id },
          });

          sUsed.add(slotKey);
          rUsed.add(slotKey);
          roomUsed.add(availableRoom.id);
          usedByUser.set(supervisorId, sUsed);
          usedByUser.set(reviewerId, rUsed);
          usedRooms.set(slotKey, roomUsed);
          reviewerRoomLock.set(reviewerId, availableRoom.id);

          let reviewerAssignments2 = reviewerDayAssignments.get(reviewerId);
          if (!reviewerAssignments2) {
            reviewerAssignments2 = new Map();
            reviewerDayAssignments.set(reviewerId, reviewerAssignments2);
          }
          reviewerAssignments2.set(slotDateStr, (reviewerAssignments2.get(slotDateStr) || 0) + 1);

          assigned = true;
          break;
        }
      }

      if (!assigned) {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'No slots left at all' },
        });
      }
    }

    console.log('✅ Scheduler completed with strict 8-topics-per-day reviewer rule.');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
    throw err;
  }
}
