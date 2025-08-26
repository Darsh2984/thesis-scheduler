import { prisma } from '@/lib/prisma';

export async function runScheduler() {
  await prisma.schedule.deleteMany();
  await prisma.conflict.deleteMany();

  try {
    const topics = await prisma.bachelorTopic.findMany({
      include: { supervisor: true, reviewer: true },
    });

    // Count how many topics each reviewer has
    const reviewerTopicCounts = new Map<number, number>();
    const reviewerRequiredDays = new Map<number, number>();

    for (const topic of topics) {
      const r = topic.reviewer;
      if (!r) continue;
      const count = (reviewerTopicCounts.get(r.id) || 0) + 1;
      reviewerTopicCounts.set(r.id, count);
    }

    for (const [reviewerId, count] of reviewerTopicCounts) {
      const reviewer = topics.find(t => t.reviewerId === reviewerId)?.reviewer;
      if (!reviewer) continue;

      if (reviewer.role === 'FT_SUPERVISOR') {
        reviewerRequiredDays.set(reviewerId, 0);
        continue;
      }

      let requiredDays = 1;
      if (count > 8 && count <= 15) requiredDays = 2;
      else if (count > 15) requiredDays = 3;

      if (reviewer.role === 'BOTH') {
        requiredDays = Math.min(requiredDays, 2);
      }

      reviewerRequiredDays.set(reviewerId, requiredDays);
    }

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
    const usedByUser = new Map<number, Set<string>>();
    const usedRooms = new Map<string, Set<number>>();
    const reviewerRoomLock = new Map<number, number>();
    const reviewerDayCount = new Map<number, Set<string>>();

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

      // --- Phase 1: Try to respect preferences and reviewer load balancing ---
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

        let days = reviewerDayCount.get(reviewerId);
        if (!days) {
          days = new Set();
          reviewerDayCount.set(reviewerId, days);
        }
        days.add(slotDateStr);

        assigned = true;
        break;
      }

      // --- Phase 2: Fallback (force schedule even if not ideal) ---
      if (!assigned) {
        for (const slot of slots) {
          const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
          const sUsed = usedByUser.get(supervisorId) || new Set();
          const rUsed = usedByUser.get(reviewerId) || new Set();
          const roomUsed = usedRooms.get(slotKey) || new Set();

          if (sUsed.has(slotKey) || rUsed.has(slotKey)) continue;

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

          // Track usage
          sUsed.add(slotKey);
          rUsed.add(slotKey);
          roomUsed.add(availableRoom.id);
          usedByUser.set(supervisorId, sUsed);
          usedByUser.set(reviewerId, rUsed);
          usedRooms.set(slotKey, roomUsed);

          reviewerRoomLock.set(reviewerId, availableRoom.id);
          assigned = true;
          break;
        }
      }

      // --- If still not assigned (no slots at all) ---
      if (!assigned) {
        await prisma.conflict.create({
          data: { topicId: topic.id, reason: 'No slots left at all' },
        });
      }
    }

    console.log('✅ Scheduler completed: all topics assigned if slots exist.');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
    throw err;
  }
}
