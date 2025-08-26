import { prisma } from '@/lib/prisma';

export async function GET(req) {
  const url = new URL(req.url);
  const id = parseInt(url.pathname.split('/').slice(-2, -1)[0]); // Extract ID from URL

  const schedules = await prisma.schedule.findMany({
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
  });

  const result = [];

  for (const s of schedules) {
    if (s.topic.supervisorId === id || s.topic.reviewerId === id) {
      result.push({
        scheduleId: s.id,
        topicTitle: s.topic.title,
        studentId: s.topic.studentId,
        studentName: s.topic.studentName,
        studentEmail: s.topic.studentEmail,
        date: s.slot.date.toISOString().split('T')[0],
        startTime: s.slot.startTime,
        endTime: s.slot.endTime,
        roomName: s.room.name,
        role: s.topic.supervisorId === id ? 'Supervisor' : 'Reviewer',
      });
    }
  }

  return Response.json(result);
}
