import { prisma } from '@/lib/prisma';

export default async function SchedulePage() {
  const schedules = await prisma.schedule.findMany({
    include: {
      topic: {
        include: {
          supervisor: true,
          reviewer: true,
        },
      },
      room: true,
      slot: true,
    },
    orderBy: {
      slot: { date: 'asc' },
    },
  });

  const conflicts = await prisma.conflict.findMany({
    include: {
      topic: true,
    },
  });

  return (
    <div className="container">
      <h1 className="pageTitle">Scheduled Presentations</h1>

      {/* Schedule Table */}
      <div className="card" style={{ overflow: 'auto', maxHeight: '70vh' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Supervisor</th>
              <th>Reviewer</th>
              <th>Room</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.topic.title}</td>
                <td>{s.topic.supervisor?.name || '—'}</td>
                <td>{s.topic.reviewer?.name || '—'}</td>
                <td>{s.room.name}</td>
                <td>{s.slot.date.toISOString().split('T')[0]}</td>
                <td>
                  {s.slot.startTime.slice(0, 5)} – {s.slot.endTime.slice(0, 5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && (
        <p style={{ marginTop: 16, color: '#6b7280' }}>
          No schedules generated yet. Click <strong>Generate Schedule</strong> in the menu to create one.
        </p>
      )}

      {/* Conflicts Section */}
      <div style={{ marginTop: 40 }}>
        <h2 className="pageTitle">Unscheduled Topics & Conflicts</h2>
        {conflicts.length === 0 ? (
          <p className="text-green-600">🎉 No conflicts found!</p>
        ) : (
          <ul className="list-disc ml-5 space-y-2">
            {conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.topic.title}</strong> – {c.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
