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
    const usedRooms = new Map<string, Set<number>>();  // slotKey -> set of roomIds
    const reviewerDayAssignments = new Map<number, Map<string, number>>(); // reviewerId -> date -> count
    const reviewerRoomDayLock = new Map<number, Map<string, number>>(); // reviewerId -> date -> roomId

    // === Group topics by reviewer ===
    const topicsByReviewer = new Map<number, any[]>();
    for (const t of topics) {
      if (!t.reviewerId) continue;
      if (!topicsByReviewer.has(t.reviewerId)) topicsByReviewer.set(t.reviewerId, []);
      topicsByReviewer.get(t.reviewerId)!.push(t);
    }

    // === Sort reviewers by total topics (ascending) ===
    const reviewersSorted = [...topicsByReviewer.entries()]
      .sort((a, b) => a[1].length - b[1].length);

    // === Loop reviewers in order ===
    for (const [reviewerId, reviewerTopics] of reviewersSorted) {
      for (const topic of reviewerTopics) {
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

        // Gather valid slots
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

          // enforce 8 topics/day
          const reviewerAssignments = reviewerDayAssignments.get(reviewerId) || new Map();
          const assignedCount = reviewerAssignments.get(dateStr) || 0;
          if (assignedCount >= 8) return false;

          return true;
        });

        // Sort valid slots by preferences (supervisor + reviewer)
        validSlots.sort((a, b) => {
          const aDate = a.date.toISOString().split('T')[0];
          const bDate = b.date.toISOString().split('T')[0];
          const prefS = preferredMap.get(supervisorId) || new Set();
          const prefR = reviewerId ? preferredMap.get(reviewerId) || new Set() : new Set();
          const aScore = (prefS.has(aDate) ? 1 : 0) + (prefR.has(aDate) ? 1 : 0);
          const bScore = (prefS.has(bDate) ? 1 : 0) + (prefR.has(bDate) ? 1 : 0);
          return bScore - aScore;
        });

        // Try to assign slot
        for (const slot of validSlots) {
          const slotKey = `${slot.date.toISOString()}_${slot.startTime}`;
          const slotDateStr = slot.date.toISOString().split('T')[0];

          const sUsed = usedByUser.get(supervisorId) || new Set();
          const rUsed = usedByUser.get(reviewerId) || new Set();
          const roomUsed = usedRooms.get(slotKey) || new Set();

          // === Room locking per day ===
          let reviewerDayRooms = reviewerRoomDayLock.get(reviewerId) || new Map();
          let lockedRoomId: number | null = reviewerDayRooms.get(slotDateStr) || null;

          let availableRoom: any = null;
          if (lockedRoomId) {
            // Reviewer is already locked to a room today → must reuse it
            if (!roomUsed.has(lockedRoomId)) {
              availableRoom = rooms.find(r => r.id === lockedRoomId);
            } else {
              // Room busy this slot → skip this slot entirely
              continue;
            }
          } else {
            // Reviewer not yet locked today → assign first free room and lock it
            for (const room of rooms) {
              if (!roomUsed.has(room.id)) {
                availableRoom = room;
                reviewerDayRooms.set(slotDateStr, room.id);
                reviewerRoomDayLock.set(reviewerId, reviewerDayRooms);
                break;
              }
            }
          }

          if (!availableRoom) continue;

          // Create schedule
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

          let reviewerAssignments = reviewerDayAssignments.get(reviewerId);
          if (!reviewerAssignments) {
            reviewerAssignments = new Map();
            reviewerDayAssignments.set(reviewerId, reviewerAssignments);
          }
          reviewerAssignments.set(slotDateStr, (reviewerAssignments.get(slotDateStr) || 0) + 1);

          assigned = true;
          break;
        }

        if (!assigned) {
          await prisma.conflict.create({
            data: { topicId: topic.id, reason: 'No slots left at all' },
          });
        }
      }
    }

    console.log('✅ Scheduler completed with strict per-day room locking + 8/day rule.');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
    throw err;
  }
}
