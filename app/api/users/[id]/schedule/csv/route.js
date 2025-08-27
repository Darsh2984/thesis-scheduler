import { prisma } from '@/lib/prisma';

export async function GET(req, context) {
  const { params } = context;
  const userId = parseInt(params.id);

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
    orderBy: [
      { slot: { date: 'asc' } },
      { slot: { startTime: 'asc' } },
    ],
  });

  // Filter schedules for this user
  const userSchedules = schedules.filter(
    (s) => s.topic.supervisorId === userId || s.topic.reviewerId === userId
  );

  const headers = [
    'Student ID',
    'Student Name',
    'Student Email',
    'Topic',
    'Role',
    'Counterpart',
    'Room',
    'Date',
    'Time',
  ];

  const rows = userSchedules.map((s) => {
    const role = s.topic.supervisorId === userId ? 'Supervisor' : 'Reviewer';
    const counterpart =
      role === 'Supervisor'
        ? s.topic.reviewer?.name || '—'
        : s.topic.supervisor?.name || '—';

    return [
      s.topic.studentId,
      s.topic.studentName,
      s.topic.studentEmail,
      s.topic.title,
      role,
      counterpart,
      s.room.name,
      s.slot.date.toISOString().split('T')[0],
      `from ${s.slot.startTime} to ${s.slot.endTime}`,
    ];
  });

  const csvContent =
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedule_user_${userId}.csv"`,
    },
  });
}
